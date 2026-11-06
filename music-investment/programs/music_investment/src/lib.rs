use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK");

// Uses the existing creation timestamp; no account layout migration is needed.
pub const FUNDING_WINDOW_SECONDS: i64 = 30 * 24 * 60 * 60;

#[program]
pub mod music_investment {
    use super::*;

    pub fn create_project(
        ctx: Context<CreateProject>,
        title: String,
        description: String,
        funding_goal: u64,
        total_shares: u64,
        revenue_share_bps: u16,
    ) -> Result<()> {
        require!(
            !title.trim().is_empty() && title.len() <= 32,
            MusicError::TitleTooLong
        );
        require!(description.len() <= 256, MusicError::DescriptionTooLong);
        require!(funding_goal > 0, MusicError::InvalidFundingGoal);
        require!(total_shares > 0, MusicError::InvalidShares);
        require!(funding_goal >= total_shares, MusicError::InvalidFundingGoal);
        require!(revenue_share_bps <= 10000, MusicError::InvalidRevenueShare);

        let project = &mut ctx.accounts.project;
        project.artist = ctx.accounts.artist.key();
        project.title = title.clone();
        project.description = description;
        project.funding_goal = funding_goal;
        project.total_shares = total_shares;
        project.shares_sold = 0;
        project.amount_raised = 0;
        project.revenue_share_bps = revenue_share_bps;
        project.status = ProjectStatus::Active;
        project.total_revenue_distributed = 0;
        project.bump = ctx.bumps.project;
        project.vault_bump = ctx.bumps.vault;
        project.created_at = Clock::get()?.unix_timestamp;

        emit!(ProjectCreated {
            project: project.key(),
            artist: project.artist,
            title,
            funding_goal,
            total_shares,
        });

        Ok(())
    }

    pub fn invest(ctx: Context<Invest>, shares_to_buy: u64) -> Result<()> {
        require!(
            ctx.accounts.project.status == ProjectStatus::Active,
            MusicError::ProjectNotActive
        );
        require!(
            Clock::get()?.unix_timestamp < funding_deadline(ctx.accounts.project.created_at)?,
            MusicError::FundingExpired
        );
        require!(shares_to_buy > 0, MusicError::InvalidShares);
        let investment_amount = investment_cost(
            ctx.accounts.project.funding_goal,
            ctx.accounts.project.total_shares,
            ctx.accounts.project.shares_sold,
            shares_to_buy,
        )?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.investor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            investment_amount,
        )?;

        let investment = &mut ctx.accounts.investment;
        investment.investor = ctx.accounts.investor.key();
        investment.project = ctx.accounts.project.key();
        investment.shares = investment
            .shares
            .checked_add(shares_to_buy)
            .ok_or(MusicError::MathOverflow)?;
        investment.amount_invested = investment
            .amount_invested
            .checked_add(investment_amount)
            .ok_or(MusicError::MathOverflow)?;
        investment.bump = ctx.bumps.investment;

        let project = &mut ctx.accounts.project;
        project.shares_sold = project
            .shares_sold
            .checked_add(shares_to_buy)
            .ok_or(MusicError::MathOverflow)?;
        project.amount_raised = project
            .amount_raised
            .checked_add(investment_amount)
            .ok_or(MusicError::MathOverflow)?;

        if project.shares_sold == project.total_shares {
            project.status = ProjectStatus::Funded;
        }

        emit!(InvestmentMade {
            project: project.key(),
            investor: ctx.accounts.investor.key(),
            shares: shares_to_buy,
            amount: investment_amount,
        });

        Ok(())
    }

    pub fn cancel_project(ctx: Context<CancelProject>) -> Result<()> {
        require!(
            ctx.accounts.project.status == ProjectStatus::Active,
            MusicError::ProjectNotActive
        );
        ctx.accounts.project.status = ProjectStatus::Cancelled;
        emit!(ProjectCancelled {
            project: ctx.accounts.project.key(),
            cancelled_by: ctx.accounts.artist.key(),
            deadline_triggered: false,
        });
        Ok(())
    }

    pub fn refund_investment(ctx: Context<RefundInvestment>) -> Result<()> {
        require!(
            refund_available(
                &ctx.accounts.project.status,
                ctx.accounts.project.created_at,
                Clock::get()?.unix_timestamp
            )?,
            MusicError::RefundNotAvailable
        );
        let amount = ctx.accounts.investment.amount_invested;
        let shares = ctx.accounts.investment.shares;
        require!(
            amount > 0 && shares > 0 && ctx.accounts.investment.revenue_claimed == 0,
            MusicError::NoInvestmentToRefund
        );

        let reserve = Rent::get()?.minimum_balance(ctx.accounts.vault.data_len());
        let vault_balance = ctx.accounts.vault.lamports();
        require!(
            vault_balance.saturating_sub(reserve) >= amount,
            MusicError::NoFundsToWithdraw
        );
        let investor_balance = ctx
            .accounts
            .investor
            .lamports()
            .checked_add(amount)
            .ok_or(MusicError::MathOverflow)?;
        let raised_after = ctx
            .accounts
            .project
            .amount_raised
            .checked_sub(amount)
            .ok_or(MusicError::MathOverflow)?;
        let shares_after = ctx
            .accounts
            .project
            .shares_sold
            .checked_sub(shares)
            .ok_or(MusicError::MathOverflow)?;

        if ctx.accounts.project.status == ProjectStatus::Active {
            // First refund after expiry permanently closes the campaign to new purchases.
            ctx.accounts.project.status = ProjectStatus::Cancelled;
            emit!(ProjectCancelled {
                project: ctx.accounts.project.key(),
                cancelled_by: ctx.accounts.investor.key(),
                deadline_triggered: true,
            });
        }
        ctx.accounts.project.amount_raised = raised_after;
        ctx.accounts.project.shares_sold = shares_after;
        **ctx.accounts.vault.try_borrow_mut_lamports()? = vault_balance - amount;
        **ctx.accounts.investor.try_borrow_mut_lamports()? = investor_balance;
        // Anchor closes this investment to its signer after success, returning its
        // account rent and preventing repeated refunds. No other investor is touched.
        emit!(InvestmentRefunded {
            project: ctx.accounts.project.key(),
            investor: ctx.accounts.investor.key(),
            amount,
            shares,
        });
        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        require!(
            ctx.accounts.project.status == ProjectStatus::Funded,
            MusicError::ProjectNotFunded
        );
        require!(
            ctx.accounts.project.artist == ctx.accounts.artist.key(),
            MusicError::Unauthorized
        );

        let vault_balance = ctx.accounts.vault.lamports();
        let rent_exempt = Rent::get()?.minimum_balance(8);
        // Revenue may already have been deposited while the project was Funded.
        // Only the funding principal belongs to the artist at this step.
        let withdraw_amount = ctx.accounts.project.amount_raised;
        require!(withdraw_amount > 0, MusicError::NoFundsToWithdraw);
        require!(
            vault_balance.saturating_sub(rent_exempt) >= withdraw_amount,
            MusicError::NoFundsToWithdraw
        );

        **ctx.accounts.vault.try_borrow_mut_lamports()? -= withdraw_amount;
        **ctx.accounts.artist.try_borrow_mut_lamports()? += withdraw_amount;

        ctx.accounts.project.status = ProjectStatus::Released;

        emit!(FundsWithdrawn {
            project: ctx.accounts.project.key(),
            artist: ctx.accounts.artist.key(),
            amount: withdraw_amount,
        });

        Ok(())
    }

    pub fn distribute_revenue(ctx: Context<DistributeRevenue>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.project.status == ProjectStatus::Released
                || ctx.accounts.project.status == ProjectStatus::Funded,
            MusicError::ProjectNotActive
        );
        require!(
            ctx.accounts.project.artist == ctx.accounts.artist.key(),
            MusicError::Unauthorized
        );
        require!(amount > 0, MusicError::InvalidAmount);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.artist.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.project.total_revenue_distributed = ctx
            .accounts
            .project
            .total_revenue_distributed
            .checked_add(amount)
            .ok_or(MusicError::MathOverflow)?;

        emit!(RevenueDistributed {
            project: ctx.accounts.project.key(),
            amount,
            total_distributed: ctx.accounts.project.total_revenue_distributed,
        });

        Ok(())
    }

    pub fn claim_revenue(ctx: Context<ClaimRevenue>) -> Result<()> {
        require!(
            ctx.accounts.investment.investor == ctx.accounts.investor.key(),
            MusicError::Unauthorized
        );
        require!(
            ctx.accounts.project.total_revenue_distributed > 0,
            MusicError::NoRevenueToDistribute
        );

        let total_claimable = revenue_entitlement(
            ctx.accounts.project.total_revenue_distributed,
            ctx.accounts.investment.shares,
            ctx.accounts.project.total_shares,
        )?;

        let claimable = total_claimable.saturating_sub(ctx.accounts.investment.revenue_claimed);
        require!(claimable > 0, MusicError::NoRevenueToDistribute);
        let available = ctx
            .accounts
            .vault
            .lamports()
            .saturating_sub(Rent::get()?.minimum_balance(8));
        require!(available >= claimable, MusicError::NoRevenueToDistribute);

        **ctx.accounts.vault.try_borrow_mut_lamports()? -= claimable;
        **ctx.accounts.investor.try_borrow_mut_lamports()? += claimable;

        ctx.accounts.investment.revenue_claimed = ctx
            .accounts
            .investment
            .revenue_claimed
            .checked_add(claimable)
            .ok_or(MusicError::MathOverflow)?;

        emit!(RevenueClaimed {
            project: ctx.accounts.project.key(),
            investor: ctx.accounts.investor.key(),
            amount: claimable,
        });

        Ok(())
    }
}

fn funding_deadline(created_at: i64) -> Result<i64> {
    created_at
        .checked_add(FUNDING_WINDOW_SECONDS)
        .ok_or_else(|| error!(MusicError::MathOverflow))
}

fn refund_available(status: &ProjectStatus, created_at: i64, now: i64) -> Result<bool> {
    match status {
        ProjectStatus::Cancelled => Ok(true),
        ProjectStatus::Active => Ok(now >= funding_deadline(created_at)?),
        ProjectStatus::Funded | ProjectStatus::Released => Ok(false),
    }
}

fn investment_cost(goal: u64, total: u64, sold: u64, buying: u64) -> Result<u64> {
    require!(total > 0 && buying > 0, MusicError::InvalidShares);
    require!(goal >= total, MusicError::InvalidFundingGoal);
    let after = sold.checked_add(buying).ok_or(MusicError::MathOverflow)?;
    require!(after <= total, MusicError::NotEnoughSharesAvailable);
    // Cumulative integer pricing allocates remainder lamports without free shares
    // or losing funding when a goal is not evenly divisible by the share count.
    let before_cost = u128::from(goal) * u128::from(sold) / u128::from(total);
    let after_cost = u128::from(goal) * u128::from(after) / u128::from(total);
    u64::try_from(after_cost - before_cost).map_err(|_| error!(MusicError::MathOverflow))
}

fn revenue_entitlement(revenue: u64, shares: u64, total: u64) -> Result<u64> {
    require!(total > 0 && shares <= total, MusicError::InvalidShares);
    u64::try_from(u128::from(revenue) * u128::from(shares) / u128::from(total))
        .map_err(|_| error!(MusicError::MathOverflow))
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateProject<'info> {
    #[account(
        init,
        payer = artist,
        space = Project::LEN,
        seeds = [b"project", artist.key().as_ref(), title.as_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = artist,
        space = 8,
        seeds = [b"vault", project.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault holds SOL for the project
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub artist: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump = project.vault_bump
    )]
    /// CHECK: PDA vault
    pub vault: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = investor,
        space = Investment::LEN,
        seeds = [b"investment", project.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investment: Account<'info, Investment>,

    #[account(mut)]
    pub investor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelProject<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump,
        has_one = artist @ MusicError::Unauthorized
    )]
    pub project: Account<'info, Project>,
    pub artist: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefundInvestment<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,
    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump = project.vault_bump,
        owner = crate::ID
    )]
    /// CHECK: Program-owned PDA vault; principal and rent are checked before transfer.
    pub vault: AccountInfo<'info>,
    #[account(
        mut,
        close = investor,
        seeds = [b"investment", project.key().as_ref(), investor.key().as_ref()],
        bump = investment.bump,
        has_one = investor @ MusicError::Unauthorized,
        has_one = project @ MusicError::Unauthorized
    )]
    pub investment: Account<'info, Investment>,
    #[account(mut)]
    pub investor: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump = project.vault_bump
    )]
    /// CHECK: PDA vault
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub artist: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeRevenue<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump = project.vault_bump
    )]
    /// CHECK: PDA vault
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub artist: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRevenue<'info> {
    #[account(
        mut,
        seeds = [b"project", project.artist.as_ref(), project.title.as_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump = project.vault_bump
    )]
    /// CHECK: PDA vault
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"investment", project.key().as_ref(), investor.key().as_ref()],
        bump = investment.bump
    )]
    pub investment: Account<'info, Investment>,

    #[account(mut)]
    pub investor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Project {
    pub artist: Pubkey,
    pub title: String,
    pub description: String,
    pub funding_goal: u64,
    pub total_shares: u64,
    pub shares_sold: u64,
    pub amount_raised: u64,
    pub revenue_share_bps: u16,
    pub status: ProjectStatus,
    pub total_revenue_distributed: u64,
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Project {
    pub const LEN: usize = 8 + 32 + (4 + 64) + (4 + 256) + 8 + 8 + 8 + 8 + 2 + 2 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Investment {
    pub investor: Pubkey,
    pub project: Pubkey,
    pub shares: u64,
    pub amount_invested: u64,
    pub revenue_claimed: u64,
    pub bump: u8,
}

impl Investment {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProjectStatus {
    Active,
    Funded,
    Released,
    Cancelled,
}

#[event]
pub struct ProjectCreated {
    pub project: Pubkey,
    pub artist: Pubkey,
    pub title: String,
    pub funding_goal: u64,
    pub total_shares: u64,
}

#[event]
pub struct InvestmentMade {
    pub project: Pubkey,
    pub investor: Pubkey,
    pub shares: u64,
    pub amount: u64,
}

#[event]
pub struct ProjectCancelled {
    pub project: Pubkey,
    pub cancelled_by: Pubkey,
    pub deadline_triggered: bool,
}

#[event]
pub struct InvestmentRefunded {
    pub project: Pubkey,
    pub investor: Pubkey,
    pub amount: u64,
    pub shares: u64,
}

#[event]
pub struct FundsWithdrawn {
    pub project: Pubkey,
    pub artist: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RevenueDistributed {
    pub project: Pubkey,
    pub amount: u64,
    pub total_distributed: u64,
}

#[event]
pub struct RevenueClaimed {
    pub project: Pubkey,
    pub investor: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum MusicError {
    #[msg("Title must contain 1 to 32 UTF-8 bytes")]
    TitleTooLong,
    #[msg("Description must be 256 characters or less")]
    DescriptionTooLong,
    #[msg("Funding goal must provide at least one lamport per share")]
    InvalidFundingGoal,
    #[msg("Shares must be greater than zero")]
    InvalidShares,
    #[msg("Revenue share must be between 0 and 10000 basis points")]
    InvalidRevenueShare,
    #[msg("Project is not active")]
    ProjectNotActive,
    #[msg("Project is not funded yet")]
    ProjectNotFunded,
    #[msg("Not enough shares available")]
    NotEnoughSharesAvailable,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("No funds to withdraw")]
    NoFundsToWithdraw,
    #[msg("No revenue to distribute")]
    NoRevenueToDistribute,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("The 30-day funding window has expired")]
    FundingExpired,
    #[msg("Refunds require cancellation or an expired incomplete campaign")]
    RefundNotAvailable,
    #[msg("No unclaimed funding contribution is available to refund")]
    NoInvestmentToRefund,
}

#[cfg(test)]
mod regression_tests {
    use super::*;

    #[test]
    fn refund_deadline_is_inclusive_and_never_reopens_funded_projects() {
        let created = 1_800_000_000;
        let deadline = funding_deadline(created).unwrap();
        assert!(!refund_available(&ProjectStatus::Active, created, deadline - 1).unwrap());
        assert!(refund_available(&ProjectStatus::Active, created, deadline).unwrap());
        assert!(refund_available(&ProjectStatus::Cancelled, created, created).unwrap());
        assert!(!refund_available(&ProjectStatus::Funded, created, deadline + 1).unwrap());
        assert!(!refund_available(&ProjectStatus::Released, created, deadline + 1).unwrap());
        assert!(funding_deadline(i64::MAX).is_err());
    }

    #[test]
    fn split_purchases_reach_the_exact_goal() {
        assert_eq!(investment_cost(10, 3, 0, 1).unwrap(), 3);
        assert_eq!(investment_cost(10, 3, 1, 1).unwrap(), 3);
        assert_eq!(investment_cost(10, 3, 2, 1).unwrap(), 4);
        assert_eq!(investment_cost(10, 3, 0, 3).unwrap(), 10);
    }

    #[test]
    fn cannot_buy_free_or_excess_shares() {
        assert!(investment_cost(1, 2, 0, 1).is_err());
        assert!(investment_cost(10, 3, 2, 2).is_err());
        assert!(investment_cost(10, 3, u64::MAX, 1).is_err());
        assert!(investment_cost(10, 3, 0, 0).is_err());
    }

    #[test]
    fn small_investors_keep_their_proportional_revenue() {
        assert_eq!(
            revenue_entitlement(1_000_000_000, 1, 100_000).unwrap(),
            10_000
        );
        assert_eq!(
            revenue_entitlement(u64::MAX, u64::MAX, u64::MAX).unwrap(),
            u64::MAX
        );
    }
}
