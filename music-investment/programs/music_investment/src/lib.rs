use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("7gyrL4T4kUXQwpGuU95QnwUsdVJ1Z5AhGeXrHY63PiwK");

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
        require!(title.len() <= 64, MusicError::TitleTooLong);
        require!(description.len() <= 256, MusicError::DescriptionTooLong);
        require!(funding_goal > 0, MusicError::InvalidFundingGoal);
        require!(total_shares > 0, MusicError::InvalidShares);
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
        require!(shares_to_buy > 0, MusicError::InvalidShares);
        require!(
            ctx.accounts.project.shares_sold + shares_to_buy <= ctx.accounts.project.total_shares,
            MusicError::NotEnoughSharesAvailable
        );

        let price_per_share = ctx.accounts.project.funding_goal
            .checked_div(ctx.accounts.project.total_shares)
            .ok_or(MusicError::MathOverflow)?;
        let investment_amount = price_per_share
            .checked_mul(shares_to_buy)
            .ok_or(MusicError::MathOverflow)?;

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
        investment.shares = investment.shares
            .checked_add(shares_to_buy)
            .ok_or(MusicError::MathOverflow)?;
        investment.amount_invested = investment.amount_invested
            .checked_add(investment_amount)
            .ok_or(MusicError::MathOverflow)?;
        investment.bump = ctx.bumps.investment;

        let project = &mut ctx.accounts.project;
        project.shares_sold = project.shares_sold
            .checked_add(shares_to_buy)
            .ok_or(MusicError::MathOverflow)?;
        project.amount_raised = project.amount_raised
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
        let withdraw_amount = vault_balance.saturating_sub(rent_exempt);
        require!(withdraw_amount > 0, MusicError::NoFundsToWithdraw);

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

        let investor_share_bps = ctx.accounts.investment.shares
            .checked_mul(10000)
            .ok_or(MusicError::MathOverflow)?
            .checked_div(ctx.accounts.project.total_shares)
            .ok_or(MusicError::MathOverflow)?;

        let total_claimable = ctx.accounts.project.total_revenue_distributed
            .checked_mul(investor_share_bps)
            .ok_or(MusicError::MathOverflow)?
            .checked_div(10000)
            .ok_or(MusicError::MathOverflow)?;

        let claimable = total_claimable.saturating_sub(ctx.accounts.investment.revenue_claimed);
        require!(claimable > 0, MusicError::NoRevenueToDistribute);

        **ctx.accounts.vault.try_borrow_mut_lamports()? -= claimable;
        **ctx.accounts.investor.try_borrow_mut_lamports()? += claimable;

        ctx.accounts.investment.revenue_claimed = ctx.accounts.investment.revenue_claimed
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
    #[msg("Title must be 64 characters or less")]
    TitleTooLong,
    #[msg("Description must be 256 characters or less")]
    DescriptionTooLong,
    #[msg("Funding goal must be greater than zero")]
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
}
