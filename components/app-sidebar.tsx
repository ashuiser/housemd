"use client";

// import { Command, Home, Inbox, Search, Sparkles } from "lucide-react";
import { RiAttachmentLine, RiChatNewLine } from "@remixicon/react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavRecents } from "@/components/nav-recents";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  // SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "New Chat",
      url: "#",
      icon: RiChatNewLine,
    },
    {
      title: "Sources",
      url: "#",
      icon: RiAttachmentLine,
    },
    // {
    //   title: "Home",
    //   url: "#",
    //   icon: Home,
    //   isActive: true,
    // },
    // {
    //   title: "Inbox",
    //   url: "#",
    //   icon: Inbox,
    //   badge: "10",
    // },
  ],
  recents: [
    {
      name: "Travel Itinerary & Trip Planner",
      url: "#",
      emoji: "✈️",
    },
    {
      name: "Photography Portfolio & Photo Journal",
      url: "#",
      emoji: "📸",
    },
    {
      name: "Cooking Challenges & Recipe Experiments",
      url: "#",
      emoji: "👨‍🍳",
    },
    {
      name: "Freelance Client Management",
      url: "#",
      emoji: "💼",
    },
    {
      name: "Startup Ideas & Business Planning",
      url: "#",
      emoji: "🚀",
    },
    {
      name: "Coding Projects & Developer Notes",
      url: "#",
      emoji: "💻",
    },
    {
      name: "Music Playlist & Album Reviews",
      url: "#",
      emoji: "🎵",
    },
    {
      name: "Pet Care & Veterinary Records",
      url: "#",
      emoji: "🐾",
    },
    {
      name: "Wedding Planning Checklist",
      url: "#",
      emoji: "💍",
    },
    {
      name: "Event Planning & Guest Management",
      url: "#",
      emoji: "🎉",
    },
    {
      name: "Mental Wellness & Mood Journal",
      url: "#",
      emoji: "🧠",
    },
    {
      name: "Meditation & Mindfulness Practice",
      url: "#",
      emoji: "🧘",
    },
    {
      name: "Academic Research & Study Notes",
      url: "#",
      emoji: "🎓",
    },
    {
      name: "Online Course Progress Tracker",
      url: "#",
      emoji: "📖",
    },
    {
      name: "Job Search & Interview Preparation",
      url: "#",
      emoji: "🎯",
    },
    {
      name: "Resume & Career Development",
      url: "#",
      emoji: "📄",
    },
    {
      name: "Art Portfolio & Creative Inspiration",
      url: "#",
      emoji: "🎨",
    },
    {
      name: "DIY Crafts & Handmade Projects",
      url: "#",
      emoji: "🛠️",
    },
    {
      name: "Car Maintenance & Service History",
      url: "#",
      emoji: "🚗",
    },
    {
      name: "Digital Marketing Campaign Planner",
      url: "#",
      emoji: "📈",
    },
    {
      name: "Social Media Content Calendar",
      url: "#",
      emoji: "📱",
    },
    {
      name: "Podcast Episodes & Listening Notes",
      url: "#",
      emoji: "🎙️",
    },
    {
      name: "Gaming Progress & Achievement Tracker",
      url: "#",
      emoji: "🎮",
    },
    {
      name: "Volunteer Activities & Community Service",
      url: "#",
      emoji: "🤝",
    },
    {
      name: "Birthday & Gift Planning",
      url: "#",
      emoji: "🎁",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
