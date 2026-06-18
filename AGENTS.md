Product Context

Substrata is a B2B export-control and trade-compliance review assistant for semiconductor and advanced hardware companies.

The first product wedge is datasheet-to-ECCN review:

Upload a semiconductor, electronics, or advanced hardware datasheet.
Extract relevant technical facts.
Compare those facts against relevant export-control review paths.
Recommend likely ECCN review paths.
Provide citations, uncertainty flags, and evidence.
Generate a human-review-ready classification memo.
Preserve an audit trail.

Substrata is not positioned as a final legal or compliance decision-maker. It helps compliance teams prepare faster, better-supported review memos.

Core Positioning Rules

Use these phrases:

recommended review paths
ECCN review assistant
classification memo draft
human-review-ready memo
evidence-backed recommendations
cited review paths
extracted technical facts
uncertainty flags
audit trail
human review queue
compliance workspace

Avoid these phrases:

final ECCN
guaranteed classification
legal determination
fully automated compliance
replaces export counsel
instant legal answer
autonomous ECCN decision
AI lawyer
black-box classification

Do not add large disclaimers to the UI unless explicitly requested. Keep compliance boundaries in calm product language.

Design Direction

Substrata should look like serious enterprise compliance software.

Visual tone:

precise
calm
technical
high-trust
operational
audit-ready
enterprise-grade

Good references:

Stripe documentation clarity
Linear product polish
IBM Carbon restraint
Vercel spacing discipline
mature fintech/compliance dashboards

Avoid:

generic AI SaaS purple gradients
glassmorphism
floating blobs
random sparkles
fake chatbots
meaningless animated dashboards
oversized buzzword hero sections
vague copy like “unlock productivity” or “supercharge your workflow”

Frontend Rules

Before implementing UI changes:

Inspect existing routes, components, styles, API calls, and assets.
Reuse existing structure where possible.
Preserve current functionality.
Prefer small, deliberate improvements over blind rewrites.

Component rules:

Use shadcn/ui-compatible components where appropriate.
Prefer source-owned components over opaque libraries.
Use Tailwind tokens consistently.
Keep dependency additions minimal.
Every interactive component should handle hover, focus, disabled, loading, and error states where relevant.
Every data surface should have empty states.
Forms should have labels, helper text, validation states, and clear actions.
Tables/lists should be readable, scannable, and responsive.

Motion rules:

Motion must clarify the product or improve orientation.
Use at most one expressive motion treatment per page.
Do not add decorative motion everywhere.
Avoid slow, distracting, or gimmicky animations.

Information Architecture

Landing page should explain:

Who it is for.
What painful workflow it improves.
How the workflow works.
What artifact the user gets.
Why human reviewers can trust it.
How Jungle Grid powers execution, if relevant.

App/dashboard should emphasize:

documents
review runs
extracted facts
recommended review paths
citations
uncertainty
memo drafts
human review status
audit trail

Recommended status labels:

Uploaded
Facts extracted
Review paths generated
Needs human review
Memo drafted
Approved
Blocked
Failed

Copywriting Rules

Write concrete product copy.

Good copy:

“Upload a datasheet and generate a cited ECCN review memo for human approval.”
“Extract device architecture, interfaces, memory, cryptography, and performance facts from source documents.”
“Show reviewers which facts support each recommended review path.”
“Keep every memo tied to its source evidence and audit trail.”

Bad copy:

“Unlock seamless AI-powered compliance.”
“Revolutionize your workflow with next-generation intelligence.”
“Classify anything instantly.”
“Automate legal decisions.”

Visual System

Use:

neutral backgrounds
subtle borders
strong text contrast
restrained accent color
clear typography scale
consistent spacing rhythm
dense but readable enterprise layouts
cards only when they support hierarchy
real product panels/screenshots over abstract decoration

Avoid:

too many cards
too many shadows
too many gradients
low-contrast gray text
random icons
decorative clutter

Accessibility

Maintain:

semantic HTML
visible focus states
sufficient contrast
keyboard-friendly controls
accessible labels
responsive layouts
readable font sizes
meaningful alt text where images are used

Validation Checklist

After frontend changes, run available project checks:

lint
typecheck
build
relevant tests if present

Then inspect visually at:

desktop width
tablet width if practical
mobile width

Before finishing, self-review:

Does the UI look specific to Substrata?
Does it avoid generic AI SaaS patterns?
Can a buyer understand the product in 5 seconds?
Does it feel credible for export compliance?
Are the primary CTAs clear?
Are loading, empty, and error states handled?
Is mobile usable?
Did any existing functionality break?

Final Response Format

When done, summarize:

files changed
major design decisions
commands run
any checks that failed
any follow-up work recommended
