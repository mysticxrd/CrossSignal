begin;

-- Cover the three-column proposal FK used by immutable approvals.
create index idx_case_response_approvals_proposal_hash
  on cfr_app.case_response_approvals (workspace_id, response_id, proposal_hash);

commit;
