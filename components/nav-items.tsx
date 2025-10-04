"use client"

import { BookOpen, Bot } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Knowledge Base",
    url: "/dashboard/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "Agent",
    url: "/dashboard/agent",
    icon: Bot,
  },
]

export function NavItems() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navItems.map((item) => {
          const isActive = pathname === item.url
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link href={item.url}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
