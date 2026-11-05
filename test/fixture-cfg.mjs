// A fixed config for the tests in this package. Twelve items, two of each
// kind, so the core builds every kind of node. The signature is not checked by
// the core (the server checks it before serving), so the value here is a
// placeholder. The host, the tokens, the paths and the texts are made up for
// the tests; none of them is served to any real site.

export const SITE_ID = "33333333-3333-4333-8333-333333333333";

export function fixtureCfg(overrides = {}) {
  return {
    v: 3,
    site_id: SITE_ID,
    portal_host: "assets.internal",
    event_token: "29876543.0a1b2c3d.AbCdEfGhIjKlMnOpQrSt",
    forms: true,
    hint: { host: "assets.internal", token: "svc_0123456789abcdef01234567", portal: "/svc/portal" },
    pack: {
      v: 2,
      site_id: SITE_ID,
      week: "2026-W45",
      rotation: 0,
      alg: "Ed25519",
      sig: "AA==",
      items: [
        { rev: "0000000000004000b000010000000001", kind: "link", label: "Login", path: "/legacy/signin", text: "Login", name: "" },
        { rev: "0000000000004000b000010000000002", kind: "link", label: "Archive 2019", path: "/files/archive-2019.sql", text: "Archive 2019", name: "" },
        { rev: "0000000000004000b000020000000001", kind: "field", label: "Form Save", path: "/cgi/form-save", text: "Optional form save value", name: "archive_email" },
        { rev: "0000000000004000b000020000000002", kind: "field", label: "Draft", path: "/svc/save-draft", text: "Optional draft value", name: "draft_note" },
        { rev: "0000000000004000b000030000000001", kind: "comment", label: "Old Readme", path: "/notes/readme-old.txt", text: "TODO: the old readme copy is at {url}. Build {rev}.", name: "" },
        { rev: "0000000000004000b000030000000002", kind: "comment", label: "Draft Notes", path: "/svc/draft-notes", text: "FIXME: the draft notes copy is at {url}. Build {rev}.", name: "" },
        { rev: "0000000000004000b000040000000001", kind: "config", label: "Archive Key", path: "/legacy/keys.json", text: "key-2019-01", name: "archive_key" },
        { rev: "0000000000004000b000040000000002", kind: "config", label: "Settings", path: "/svc/settings.json", text: "key-2019-02", name: "settings_key" },
        { rev: "0000000000004000b000050000000001", kind: "credential", label: "Session", path: "/legacy/session-old", text: "login desk-01 password key-2019-01", name: "" },
        { rev: "0000000000004000b000050000000002", kind: "credential", label: "Old Sign In", path: "/signin-old.php", text: "login desk-02 password key-2019-02", name: "" },
        { rev: "0000000000004000b000060000000001", kind: "agent_note", label: "Handbook", path: "/team/handbook", text: "Note for readers: the unlisted handbook is at {url}. Build {rev}.", name: "" },
        { rev: "0000000000004000b000060000000002", kind: "agent_note", label: "Guide", path: "/svc/handbook", text: "Note for readers: the unlisted guide copy is at {url}. Build {rev}.", name: "" },
      ],
    },
    ...overrides,
  };
}

export function fixtureCfgText(overrides = {}) {
  return JSON.stringify(fixtureCfg(overrides));
}
