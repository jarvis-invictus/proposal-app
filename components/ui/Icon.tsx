'use client';
import * as React from 'react';
import {
  Sparkles, LoaderCircle, Check, CircleCheckBig, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Mic, ChevronDown, X,
  Info, TriangleAlert, MoreHorizontal, FileText, Users, Library, Settings, CircleHelp, Search, Plus,
  Upload, LayoutTemplate, Link as LinkIcon, Eye, EyeOff, Undo2, Redo2, Palette, Bold, Italic, List,
  Heading2, Lock, CreditCard, PenLine, ChevronsLeft, ChevronsRight, Ellipsis, Copy, FileDown, Trash2,
  Clock, FilePlus2, RotateCcw, Bell, Menu, IndianRupee, Send, QrCode, User, Globe, UserPlus,
  ShoppingBag, Building2, Megaphone, Code, CircleEllipsis, LayoutDashboard, ScanSearch, Image,
  MessageSquare, GitBranch, WandSparkles, TrendingUp, Repeat, Wrench, Component, Briefcase,
  type LucideProps,
} from 'lucide-react';

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  sparkles: Sparkles, 'loader-circle': LoaderCircle, check: Check, 'circle-check-big': CircleCheckBig,
  'arrow-up': ArrowUp, 'arrow-down': ArrowDown, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, mic: Mic, 'chevron-down': ChevronDown,
  x: X, info: Info, 'triangle-alert': TriangleAlert, 'more-horizontal': MoreHorizontal, 'file-text': FileText,
  users: Users, library: Library, settings: Settings, 'circle-help': CircleHelp, search: Search, plus: Plus,
  upload: Upload, 'layout-template': LayoutTemplate, link: LinkIcon, eye: Eye, 'eye-off': EyeOff,
  'undo-2': Undo2, 'redo-2': Redo2, palette: Palette, bold: Bold, italic: Italic, list: List,
  'heading-2': Heading2, lock: Lock, 'credit-card': CreditCard, signature: PenLine,
  'chevrons-left': ChevronsLeft, 'chevrons-right': ChevronsRight, ellipsis: Ellipsis,
  copy: Copy, 'file-down': FileDown, 'trash-2': Trash2, clock: Clock, 'file-plus-2': FilePlus2,
  'rotate-ccw': RotateCcw, bell: Bell, menu: Menu, 'indian-rupee': IndianRupee, send: Send, 'qr-code': QrCode,
  user: User, globe: Globe, 'user-plus': UserPlus, 'shopping-bag': ShoppingBag,
  'building-2': Building2, megaphone: Megaphone, code: Code, 'circle-ellipsis': CircleEllipsis,
  'layout-dashboard': LayoutDashboard, 'scan-search': ScanSearch, image: Image,
  'message-square': MessageSquare, github: GitBranch, 'wand-sparkles': WandSparkles,
  'trending-up': TrendingUp, repeat: Repeat, wrench: Wrench, component: Component, briefcase: Briefcase,
};

export interface IconProps {
  name?: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Renders a Lucide glyph, tinted with currentColor by default — same `name` API as the CDN-mask version. */
export function Icon({ name = 'sparkles', size = 18, color = 'currentColor', className, style }: IconProps) {
  const Cmp = MAP[name] || Sparkles;
  return <Cmp size={size} color={color} strokeWidth={1.75} className={className} style={{ flex: 'none', display: 'inline-block', ...style }} />;
}
