import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Phone, Stethoscope, ClipboardList } from 'lucide-react';
import { defaultSettings, safeLink } from '@/lib/model';

export default function HospitalHero({ settings: s }: { settings: typeof defaultSettings }) {
  return <>
    <section className="hospital-hero" aria-labelledby="hospital-hero-title">
      <div className="container hero-layout">
        <div className="hero-editorial">
          <div className="hero-location"><span aria-hidden="true" />BUGEMA · UGANDA</div>
          <h1 id="hospital-hero-title">{s.heroTitle}</h1>
          <div className="hero-rule" aria-hidden="true"><span /><span /><span /></div>
          <p className="lead">{s.heroText}</p>
          <div className="actions hero-actions">
            <Link className="button" href="/appointments"><CalendarDays size={18} aria-hidden="true" />Request an Appointment<ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="hero-contact-link" href="/contact">Contact our team<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="hero-urgent"><span className="urgent-icon"><Phone size={20} aria-hidden="true" /></span><div><span>Need urgent assistance?</span><a href={'tel:' + s.emergency}>{s.emergency}</a><small>For emergencies, call directly. Online forms are not emergency services.</small></div></div>
        </div>
        <div className="hero-visual">
          <span className="hero-outline-cross" aria-hidden="true">+</span>
          <figure className="hero-photograph">
            <img fetchPriority="high" src={safeLink(s.heroImage)} alt={s.heroAlt} width={900} height={1050} />
            <figcaption>{s.heroAlt.includes('Illustrative') ? 'Illustrative hospital photograph' : ''}</figcaption>
          </figure>
          <div className="hero-visit-panel"><div className="visit-panel-icon"><MapPin size={23} aria-hidden="true" /></div><div><span className="eyebrow">PLAN YOUR VISIT</span><p>{s.address}</p><Link href="/contact">Location & directions<ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
          <span className="hero-red-corner" aria-hidden="true" />
        </div>
      </div>
    </section>
    <nav className="container patient-pathways" aria-label="Patient quick links">
      {[{ href: '/departments', number: '01', icon: Stethoscope, title: 'Find a department', detail: 'Explore departments & services' }, { href: '/doctors', number: '02', icon: ClipboardList, title: 'Find a doctor', detail: 'View published doctor profiles' }, { href: '/patient-information', number: '03', icon: CalendarDays, title: 'Before your visit', detail: 'Patient & visitor information' }].map(item => <Link href={item.href} key={item.href}><span className="pathway-number">{item.number}</span><item.icon size={24} strokeWidth={1.6} aria-hidden="true" /><span className="pathway-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight className="pathway-arrow" size={19} aria-hidden="true" /></Link>)}
    </nav>
  </>;
}
