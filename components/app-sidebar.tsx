"use client";

import {
  RiAttachmentLine,
  RiChatNewLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { NavMain } from "@/components/nav-main";
import { NavRecents } from "@/components/nav-recents";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

const data = {
  navMain: [
    {
      title: "New Chat",
      url: "/dashboard/chat",
      icon: RiChatNewLine,
    },
    {
      title: "Sources",
      url: "/dashboard/sources",
      icon: RiAttachmentLine,
    },
    {
      title: "Trusted Domains",
      url: "/dashboard/trusted-domains",
      icon: RiShieldCheckLine,
    },
  ],
  recents: [
    { name: "Travel Itinerary & Trip Planner", url: "#", emoji: "✈️" },
    { name: "Photography Portfolio & Photo Journal", url: "#", emoji: "📸" },
    {
      name: "Cooking Challenges & Recipe Experiments",
      url: "#",
      emoji: "👨‍🍳",
    },
    { name: "Freelance Client Management", url: "#", emoji: "💼" },
    { name: "Startup Ideas & Business Planning", url: "#", emoji: "🚀" },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState({
    name: "",
    email: "",
    avatar: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser({
            name: data.name,
            email: data.email,
            avatar: "",
          });
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));
  }, []);

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="hover:bg-transparent text-primary py-2 px-3">
              <span className="text-xl font-bold tracking-tight">HouseMD</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavRecents recents={data.recents} />
      </SidebarContent>
      <SidebarFooter>{user.name && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
