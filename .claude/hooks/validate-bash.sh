#!/usr/bin/env bash
# PreToolUse guard for Bash/PowerShell. exit 0 = allow, exit 2 = block.
# Blocks only what should never run unattended; the user runs these themselves.

payload=$(cat)

cmd=$(printf '%s' "$payload" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')
[ -z "$cmd" ] && exit 0

# match the command line only, never heredoc bodies or file content
cmd=$(printf '%s' "$cmd" | sed 's/\\n/\n/g' | head -1)

block() {
  echo "Blocked: $1 Run it yourself if you intend to." >&2
  exit 2
}

case "$cmd" in
  *prisma:reset*|*"prisma migrate reset"*|*"db reset"*)
    block "destructive database reset." ;;
  *prisma:push*|*"prisma db push"*)
    block "schema push bypasses migrations. Use pnpm prisma:migrate." ;;
  *"git push"*)
    block "no auto-push in this repo." ;;
  *"git reset --hard"*|*"git clean -"*[fdx]*)
    block "discards uncommitted work." ;;
  *"rm -rf /"*|*"rm -rf ~"*)
    block "recursive delete outside the repo." ;;
  *"docker system prune"*|*"docker volume rm"*)
    block "destroys local containers or volumes." ;;
esac

exit 0
