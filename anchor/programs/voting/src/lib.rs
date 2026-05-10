use anchor_lang::prelude::*;

declare_id!("FeWSegnZmmk3kJHnAKaDZjMS7iBD7UEzzvcRnWQnqXNq");

pub const MAX_QUESTION_LEN: usize = 280;
pub const MAX_OPTION_LEN: usize = 64;
pub const MAX_OPTIONS: usize = 10;
pub const MIN_OPTIONS: usize = 2;

#[program]
pub mod voting {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        question: String,
        options: Vec<String>,
        ends_at: i64,
    ) -> Result<()> {
        require!(!question.is_empty(), VotingError::EmptyQuestion);
        require!(question.len() <= MAX_QUESTION_LEN, VotingError::QuestionTooLong);
        require!(
            options.len() >= MIN_OPTIONS && options.len() <= MAX_OPTIONS,
            VotingError::InvalidOptionsCount
        );
        for option in options.iter() {
            require!(!option.is_empty(), VotingError::EmptyOption);
            require!(option.len() <= MAX_OPTION_LEN, VotingError::OptionTooLong);
        }

        let now = Clock::get()?.unix_timestamp;
        require!(ends_at > now, VotingError::InvalidEndTime);

        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.creator = ctx.accounts.creator.key();
        poll.question = question;
        poll.option_count = options.len() as u8;
        poll.options = options;
        poll.vote_counts = vec![0u64; poll.option_count as usize];
        poll.total_votes = 0;
        poll.created_at = now;
        poll.ends_at = ends_at;
        poll.is_active = true;
        poll.bump = ctx.bumps.poll;

        emit!(PollCreated {
            poll_id,
            creator: poll.creator,
            question: poll.question.clone(),
            options_count: poll.option_count,
            ends_at,
        });

        Ok(())
    }

    pub fn cast_vote(ctx: Context<CastVote>, _poll_id: u64, option_index: u8) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let vote_record = &mut ctx.accounts.vote_record;

        require!(poll.is_active, VotingError::PollNotActive);
        require!(
            Clock::get()?.unix_timestamp < poll.ends_at,
            VotingError::PollEnded
        );
        require!(
            (option_index as usize) < poll.options.len(),
            VotingError::InvalidOption
        );

        vote_record.voter = ctx.accounts.voter.key();
        vote_record.poll_id = poll.poll_id;
        vote_record.option_index = option_index;
        vote_record.voted_at = Clock::get()?.unix_timestamp;
        vote_record.bump = ctx.bumps.vote_record;

        poll.vote_counts[option_index as usize] = poll.vote_counts[option_index as usize]
            .checked_add(1)
            .ok_or(VotingError::Overflow)?;
        poll.total_votes = poll
            .total_votes
            .checked_add(1)
            .ok_or(VotingError::Overflow)?;

        emit!(VoteCast {
            poll_id: poll.poll_id,
            voter: ctx.accounts.voter.key(),
            option_index,
            voted_at: vote_record.voted_at,
        });

        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>, _poll_id: u64) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        require!(poll.is_active, VotingError::PollAlreadyClosed);
        poll.is_active = false;

        emit!(PollClosed {
            poll_id: poll.poll_id,
            total_votes: poll.total_votes,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CreatePoll<'info> {
    #[account(
        init,
        payer = creator,
        space = Poll::INIT_SPACE,
        seeds = [b"poll", poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CastVote<'info> {
    #[account(
        mut,
        seeds = [b"poll", poll_id.to_le_bytes().as_ref()],
        bump = poll.bump,
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = voter,
        space = VoteRecord::INIT_SPACE,
        seeds = [b"vote", poll_id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct ClosePoll<'info> {
    #[account(
        mut,
        seeds = [b"poll", poll_id.to_le_bytes().as_ref()],
        bump = poll.bump,
        has_one = creator @ VotingError::Unauthorized,
    )]
    pub poll: Account<'info, Poll>,

    pub creator: Signer<'info>,
}

#[account]
pub struct Poll {
    pub poll_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub option_count: u8,
    pub options: Vec<String>,
    pub vote_counts: Vec<u64>,
    pub total_votes: u64,
    pub created_at: i64,
    pub ends_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl Poll {
    // 8 discriminator
    // + 8 poll_id
    // + 32 creator
    // + 4 + MAX_QUESTION_LEN (string prefix + max bytes)
    // + 1 option_count
    // + 4 + MAX_OPTIONS * (4 + MAX_OPTION_LEN)
    // + 4 + MAX_OPTIONS * 8
    // + 8 total_votes
    // + 8 created_at
    // + 8 ends_at
    // + 1 is_active
    // + 1 bump
    pub const INIT_SPACE: usize = 8
        + 8
        + 32
        + 4 + MAX_QUESTION_LEN
        + 1
        + 4 + MAX_OPTIONS * (4 + MAX_OPTION_LEN)
        + 4 + MAX_OPTIONS * 8
        + 8
        + 8
        + 8
        + 1
        + 1;
}

#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub poll_id: u64,
    pub option_index: u8,
    pub voted_at: i64,
    pub bump: u8,
}

impl VoteRecord {
    // 8 discriminator + 32 voter + 8 poll_id + 1 option_index + 8 voted_at + 1 bump
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 1 + 8 + 1;
}

#[event]
pub struct PollCreated {
    pub poll_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub options_count: u8,
    pub ends_at: i64,
}

#[event]
pub struct VoteCast {
    pub poll_id: u64,
    pub voter: Pubkey,
    pub option_index: u8,
    pub voted_at: i64,
}

#[event]
pub struct PollClosed {
    pub poll_id: u64,
    pub total_votes: u64,
}

#[error_code]
pub enum VotingError {
    #[msg("Question must not be empty")]
    EmptyQuestion,
    #[msg("Question exceeds maximum length of 280 characters")]
    QuestionTooLong,
    #[msg("Option must not be empty")]
    EmptyOption,
    #[msg("Option exceeds maximum length of 64 characters")]
    OptionTooLong,
    #[msg("Poll must have between 2 and 10 options")]
    InvalidOptionsCount,
    #[msg("Poll end time must be in the future")]
    InvalidEndTime,
    #[msg("Poll is not active")]
    PollNotActive,
    #[msg("Poll is already closed")]
    PollAlreadyClosed,
    #[msg("Poll has ended")]
    PollEnded,
    #[msg("Invalid option index")]
    InvalidOption,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Only the poll creator can perform this action")]
    Unauthorized,
}
