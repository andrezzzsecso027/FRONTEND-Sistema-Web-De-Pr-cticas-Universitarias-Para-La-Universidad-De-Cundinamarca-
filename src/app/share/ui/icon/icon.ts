import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, inject } from '@angular/core';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Ban, Bell, Briefcase, Building2, Calendar, Camera, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, Clock, ExternalLink, Eye, FileCheck2, FileText,
  Filter, FolderGit2, GraduationCap, Inbox, KeyRound, LayoutDashboard, Link2, LogOut, Mail, MapPin, MessageSquareText,
  Phone, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, Star, Upload, User, UserCheck, Users, Wallet, X, XCircle,
  createElement, type IconNode
} from 'lucide';

/**
 * Registro de íconos usados en la app (Lucide, trazo 1.5–2px como shadcn/Clerk).
 * Solo se importan los que se usan, así el bundle no carga los ~2000 íconos de la librería.
 * Para agregar uno: importarlo arriba y añadirlo aquí con un nombre en kebab-case.
 */
const ICONOS: Record<string, IconNode> = {
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'badge-check': BadgeCheck, 'ban': Ban, 'bell': Bell,
  'briefcase': Briefcase, 'building': Building2, 'calendar': Calendar, 'camera': Camera, 'check': Check,
  'check-circle': CheckCircle2, 'chevron-down': ChevronDown, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight,
  'alert': CircleAlert, 'clipboard': ClipboardList, 'clock': Clock, 'external-link': ExternalLink, 'eye': Eye,
  'file-check': FileCheck2, 'file-text': FileText, 'filter': Filter, 'repo': FolderGit2, 'graduation-cap': GraduationCap,
  'inbox': Inbox, 'key': KeyRound, 'dashboard': LayoutDashboard, 'link': Link2, 'log-out': LogOut, 'mail': Mail,
  'map-pin': MapPin, 'message': MessageSquareText, 'phone': Phone, 'plus': Plus, 'refresh': RefreshCw, 'save': Save,
  'search': Search, 'shield-check': ShieldCheck, 'sparkles': Sparkles, 'star': Star, 'upload': Upload, 'user': User,
  'user-check': UserCheck, 'users': Users, 'wallet': Wallet, 'x': X, 'x-circle': XCircle
};

export type NombreIcono = keyof typeof ICONOS;

/**
 * Ícono SVG en línea: `<ui-icon name="briefcase" />`.
 * Hereda el color del texto (currentColor) y se alinea con el texto que lo acompaña.
 * Es decorativo (aria-hidden) salvo que se le pase `label`.
 */
@Component({
  selector: 'ui-icon',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-icon' }
})
export class Icon implements OnChanges {
  @Input({ required: true }) name!: string;
  @Input() size = 16;
  @Input() strokeWidth = 1.75;
  /** Texto accesible; si se omite el ícono se oculta a lectores de pantalla. */
  @Input() label?: string;

  private readonly host = inject(ElementRef<HTMLElement>);

  ngOnChanges(): void {
    const nodo = ICONOS[this.name];
    const el = this.host.nativeElement;
    el.replaceChildren();
    if (!nodo) {
      console.warn(`[ui-icon] Ícono no registrado: "${this.name}"`);
      return;
    }
    const svg = createElement(nodo, {
      width: this.size,
      height: this.size,
      'stroke-width': this.strokeWidth,
      'aria-hidden': this.label ? 'false' : 'true',
      ...(this.label ? { role: 'img', 'aria-label': this.label } : {})
    });
    el.appendChild(svg);
  }
}
