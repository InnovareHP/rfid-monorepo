import { authClient } from "@/lib/auth-client";
import { DASHBOARD_URL, ROLES } from "@/lib/contant";
import {
  DEFAULT_LANGUAGE_LABEL,
  FOOTER_COPYRIGHT,
  FOOTER_LINKS,
  LANGUAGE_OPTIONS,
  LOGO_ALT_TEXT,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useParams,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import type { User as BetterAuthUser } from "better-auth";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Menu,
  User,
} from "lucide-react";

type SupportLayoutProps = {
  children: React.ReactNode;
};

export function SupportLayout({ children }: SupportLayoutProps) {
  const params = useParams({ strict: false });
  const queryClient = useQueryClient();
  const router = useRouter();
  const lang = (params as { lang?: string }).lang ?? "en";
  const accountPath = `/${lang}/account`;
  const requestPath = `/${lang}/request`;

  const { user } = useRouteContext({ from: "__root__" }) as {
    user: BetterAuthUser & { role: string };
  };

  const isSupport = user?.role === ROLES.SUPPORT;
  const dropdownContentClass =
    "w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg";
  const dropdownSideOffset = 4;

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      queryClient.clear();
      router.invalidate();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-muted/30 overflow-x-hidden">
      <header className="shrink-0 bg-[#004aad] text-white">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 max-w-[1920px] mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/"
              className="block shrink-0 cursor-pointer rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#004aad]"
              aria-label="Go to home"
            >
              <img
                src="/images/navbar-logo.png"
                alt={LOGO_ALT_TEXT}
                className="h-[60px] w-auto object-contain"
              />
            </Link>
            <div className="h-6 w-px bg-white/50 shrink-0" aria-hidden />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-white hover:bg-white/10 hover:text-white gap-1 shrink-0"
                >
                  {DEFAULT_LANGUAGE_LABEL}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={dropdownContentClass}
                sideOffset={dropdownSideOffset}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.label}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer text-white hover:bg-white/10 hover:text-white"
            >
              Contact Us
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer text-white hover:bg-white/10 hover:text-white gap-1"
                  >
                    <img
                      src={user.image ?? ""}
                      alt={user.name ?? ""}
                      className="size-6 rounded-full object-cover"
                    />
                    {user.name}
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={dropdownContentClass}
                  sideOffset={dropdownSideOffset}
                >
                  <DropdownMenuGroup>
                    {isSupport ? (
                      <DropdownMenuItem asChild>
                        <Link to="/support" className="cursor-pointer">
                          <LayoutDashboard className="size-4" />
                          Support Dashboard
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to={requestPath} className="cursor-pointer">
                            <ClipboardList className="size-4" />
                            My requests
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={accountPath} className="cursor-pointer">
                            <User className="size-4" />
                            Account
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                className="cursor-pointer text-white hover:bg-white/10 hover:text-white"
              >
                <a href={`${DASHBOARD_URL}/login`}>
                  <LogIn className="size-4" />
                  Login
                </a>
              </Button>
            )}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer md:hidden text-white hover:bg-white/10 hover:text-white shrink-0"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={dropdownContentClass}
              sideOffset={dropdownSideOffset}
            >
              <DropdownMenuGroup>
                {isSupport ? (
                  <DropdownMenuItem asChild>
                    <Link to="/support" className="cursor-pointer">
                      <LayoutDashboard className="size-4" />
                      Support Dashboard
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <>
                    {" "}
                    <DropdownMenuItem asChild>
                      <Link to={requestPath} className="cursor-pointer">
                        <ClipboardList className="size-4" />
                        My requests
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="size-4" />
                      Contact Us
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={accountPath} className="cursor-pointer">
                        <User className="size-4" />
                        Account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Button
                  size="icon"
                  onClick={handleLogout}
                  className="w-full cursor-pointer text-white hover:bg-white/10 hover:text-white gap-1"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 w-full">{children}</div>

      <footer className="border-t bg-background py-4 px-4 sm:py-5 sm:px-6 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 max-w-[1920px] mx-auto text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          <span>{FOOTER_COPYRIGHT}</span>
          <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 sm:gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((label) => (
              <Button
                key={label}
                variant="link"
                className="cursor-pointer text-muted-foreground h-auto p-0 text-sm font-normal"
              >
                {label}
              </Button>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
