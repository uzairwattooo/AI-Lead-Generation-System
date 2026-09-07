"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { LogOut, Moon, Settings, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { initialsFromEmail } from "@/lib/format";

export function ProfileMenu() {
  const { user, signOut, demo } = useAuth();
  const { theme, setTheme } = useTheme();
  const email = user?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback>{initialsFromEmail(email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <p className="truncate text-sm font-medium">{email || "Unknown user"}</p>
          <p className="text-[11px] text-[var(--app-text-subtle)]">
            {demo ? "Demo workspace" : "CodeNativeX workspace"}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setTheme(theme === "dark" ? "light" : "dark");
          }}
        >
          {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
