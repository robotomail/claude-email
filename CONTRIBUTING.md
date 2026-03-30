# Contributing

Thanks for your interest in contributing to the Robotomail channel plugin for Claude Code.

## How to contribute

The best way to contribute right now is by opening a [GitHub issue](https://github.com/robotomail/claude-email/issues):

- **Bug reports** — describe what happened, what you expected, and steps to reproduce
- **Feature requests** — explain the use case and what you'd like to see
- **Questions** — anything unclear about setup, usage, or architecture

Pull requests are not open at this time. If you have a fix or improvement, open an issue describing it and we'll work with you to get it in.

## Local development

Load the plugin directly from your local directory:

```bash
claude --plugin-dir ./claude-email --dangerously-load-development-channels server:robotomail
```

Use `/reload-plugins` inside Claude Code to pick up changes without restarting (except for changes to `server.ts` or `.mcp.json`, which require a restart).

## Project structure

```
├── server.ts          Main MCP server — channel capability, tools, SSE handler
├── sse.ts             SSE client — connect, parse, reconnect, dedup
├── send.ts            REST API wrapper for sending emails and fetching messages
├── access.ts          Sender allowlist, pairing, and access policy logic
├── config.ts          Env var loading and validation
├── types.ts           Shared TypeScript types
├── commands/          Slash commands (/robotomail:configure, /robotomail:access)
├── skills/            Standalone email skill (SKILL.md)
└── .claude-plugin/    Plugin manifest and marketplace config
```

## Guidelines

- **Keep it simple.** This is a lightweight plugin, not a framework. Fewer dependencies is better.
- **No build step.** Bun runs TypeScript directly. No compilation, no bundling.
- **Test manually.** There's no test suite (matching the pattern of official Claude Code plugins). Test by running the plugin locally and verifying behavior.
- **Match the style.** Follow the existing code patterns. TypeScript, no semicolons optional (we use them), explicit types where helpful.

## What to contribute

- Bug fixes
- SSE connection reliability improvements
- Better error messages
- Documentation improvements
- Access control enhancements

## What not to change without discussion

- The MCP notification format (must match Claude Channels spec)
- The access control security model (allowlist default, source-based anti-injection)
- The overall architecture (SSE direct, no webhooks, no HTTP listener)

Open an issue first if you want to propose a significant change.

## Code of conduct

Be kind, be constructive. We're building tools for developers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
