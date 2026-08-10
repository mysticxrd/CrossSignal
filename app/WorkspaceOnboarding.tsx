"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createWorkspaceAction } from "./workspace-actions";
import type { OwnerSummary } from "./workspace-types";

type WorkspaceOnboardingProps = {
  owner: OwnerSummary;
};

export default function WorkspaceOnboarding({ owner }: WorkspaceOnboardingProps) {
  const router = useRouter();
  const [name, setName] = useState("Atlas Foundry");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ownerName = owner.fullName ?? owner.displayName;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createWorkspaceAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-brand-panel">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>CrossSignal</strong><small>Revenue flight recorder</small></span>
        </div>
        <div className="onboarding-copy">
          <span className="eyebrow">OWNER SETUP · 1 OF 1</span>
          <h1>Give every decision a home.</h1>
          <p>A workspace keeps its evidence, approvals, interventions, and learning ledger isolated from every other company.</p>
          <ol className="onboarding-rails">
            <li className="complete"><span>01</span><div><strong>Identity verified</strong><small>Signed in as {owner.email}</small></div></li>
            <li className="active"><span>02</span><div><strong>Create workspace</strong><small>Name the company or product being monitored</small></div></li>
            <li><span>03</span><div><strong>Seed flight recorder</strong><small>Load the inspectable demo case</small></div></li>
          </ol>
        </div>
        <p className="onboarding-footnote">Authentication identifies the owner. Server-side membership checks authorize every workspace read and write.</p>
      </section>

      <section className="onboarding-form-panel">
        <div className="owner-verified-card">
          <span className="owner-avatar">{ownerName.slice(0, 1).toUpperCase()}</span>
          <span><small>VERIFIED OWNER</small><strong>{ownerName}</strong><em>{owner.email}</em></span>
          <i aria-hidden="true">✓</i>
        </div>
        <form className="workspace-form" onSubmit={handleSubmit}>
          <div className="eyebrow">NEW WORKSPACE</div>
          <h2>Create your first workspace</h2>
          <p>We’ll attach the seeded checkout-regression case so you can test the full decision loop immediately.</p>
          <label htmlFor="workspace-name">Company or product name</label>
          <input
            id="workspace-name"
            name="workspaceName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={64}
            autoComplete="organization"
            disabled={pending}
            required
          />
          <div className="workspace-form-note"><span aria-hidden="true">◇</span><p><strong>Owner-only by default</strong><br />Only your authenticated identity can access this workspace until an explicit collaboration policy is added.</p></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-block" disabled={pending || name.trim().length < 2}>
            {pending ? <><span className="spinner" /> Creating secure workspace…</> : <>Create workspace <span aria-hidden="true">→</span></>}
          </button>
        </form>
        <a className="onboarding-signout" href="/signout-with-chatgpt?return_to=%2F">Not {ownerName}? Sign out</a>
      </section>
    </main>
  );
}
