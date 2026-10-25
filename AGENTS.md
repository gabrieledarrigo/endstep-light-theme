# Rules for this project

This file is for every human and every agent who works on this repository.
Read it before you write a document, open an issue, or write code.

The project is a browser extension. It gives endstep.cc a light theme, with a switch back to the original dark theme.
Target browsers: Chrome, Firefox, Safari.

## 1. How we write

These rules apply to requirements, user stories, issues, and pull request descriptions.

- Write Simple English, as defined by [SimpleEnglish](https://github.com/AminBlg/SimpleEnglish) (ASD-STE100 discipline).
- Use active voice and simple tenses.
- One instruction has at most 20 words. One description has at most 25 words.
- Do not use "should", "would", "may", or "might". Use "can", "will", or "must".
- Use one word for one meaning in the whole document.
- Put the condition before the command. Example: "If the toggle is off, show the dark theme."
- Do not use filler adjectives such as "robust" or "crucial".
- Do not use bold lead-ins.

Exception to SimpleEnglish: bullet lists and numbered lists are allowed. Use them to explain or to summarize.

Keep paragraphs short. Leave an empty line between paragraphs. The reader is not a native English speaker.

## 2. Requirements

Requirements live in `docs/requirements.md`.

The document has two lists:

- Functional requirements: what the extension does.
- Non-functional requirements: how the extension behaves (performance, privacy, compatibility).

Every requirement has:

1. A short title in plain words, such as "Theme toggle". No codes.
2. A user story: "As a ..., I want ..., so that ...".
3. Acceptance criteria: a checklist a tester can verify.
4. Technical tasks: the steps to implement it. A person or agent with no prior knowledge must be able to follow them.

The requirements include the technical choices: language, frameworks, libraries, build tool.

The document is the draft. When a requirement becomes a GitHub issue, the issue is the source of truth.
The document then links to the issue, and people refer to the work by the issue number and title.

## 3. Work tracking

We use a GitHub Project with milestones and issues.

- Milestones follow the delivery steps. Example: "Theme in Chrome", "Toggle", "Firefox", "Safari", "Store release".
- Labels are a small fixed set. Use only labels that exist in the repository.
- One issue is implemented by one pull request.
- The branch name is the one GitHub creates from the issue.

## 4. Code comments

- Do not write inline comments in the code. No `//` and no `/* */` comments inside functions or between statements.
- The only allowed comment is a JSDoc block, placed above a function, a class, a type, or an exported value.
- If the code needs a comment to be understood, change the code: a better name, a smaller function.

## 5. Commits

- Commit as the repository owner: Gabriele D'Arrigo, darrigo.g@gmail.com.
- Never add a `Co-Authored-By` line.
- One commit per logical step. The message is one sentence.
- Never commit on `main`. Pull requests are squashed into `main`.

## 6. Pull requests

A pull request:

- Comes from the issue branch and references the issue with "Closes #<number>".
- Has the labels, the milestone, and the project of the issue.
- Is assigned to the repository owner.
- Has a short description with two sections: "What was done" and "Walk me through".

Use the template in `.github/PULL_REQUEST_TEMPLATE.md`.

## 7. Flow for an implementing agent

1. Read the issue and the related requirement.
2. Create or check out the issue branch.
3. Write the code against the requirement.
4. Ask one subagent for an adversarial review. The review looks for bugs, unmet requirements, and unexpected behavior. Only one review round.
5. Fix the findings.
6. Open the pull request as described in section 6.

The agent must not:

- Merge a pull request.
- Change the requirements. If the review finds a requirement that is inconsistent, the agent reports it in the pull request and stops. A human decides.
- Push to `main`.
- Ask another session to do an action that was denied in its own session.

## 8. Definition of done

A pull request is done when:

- The code builds, lints, and is formatted. The unit tests pass. A GitHub Actions workflow runs these checks on every pull request and on every merge to `main`.
- The implementation respects the functional requirements.
- The end-to-end tests pass against the acceptance criteria. End-to-end tests run in Chrome only.
- The repository owner reviewed and merged the pull request.

## 9. Releases

- Versions follow semantic versioning: `MAJOR.MINOR.PATCH`. Store manifests accept only numbers, so no suffix such as `-beta`.
- `package.json` holds the version. The build copies it into the manifests.
- A release is a git tag such as `v1.2.0`. The version is bumped per release, not per pull request.
- A GitHub Actions workflow runs on the tag. It builds one zip for Chrome and one for Firefox, creates the GitHub Release, and attaches the zips.
- Release notes are generated from the titles of the merged pull requests, grouped by label.
- Upload to the Chrome Web Store and to Firefox Add-ons is automated in the same workflow when the store credentials are available as repository secrets.
- Safari packaging is out of scope for now.

## 10. Privacy

The extension collects no personal data. Install and uninstall counts come from the store dashboards.
Any other statistic must be anonymous and must be listed in the requirements first.

## 11. Open points

- How requirements map to issues: one to one, or one to many. We decide when we split the requirements.
