import StethoscopeScene from './StethoscopeScene';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Phone, Mail, Stethoscope, ClipboardList } from 'lucide-react';
import { defaultSettings } from '@/lib/model';

export default function HospitalHero({ settings: s }: { settings: typeof defaultSettings }) {
  const words=s.heroTitle.trim().split(/\s+/);const accent=words.pop();
  return <>
    <section className="hospital-hero reference-hero" aria-labelledby="hospital-hero-title">
      <div className="container hero-layout">
        <div className="hero-editorial">
          <div className="hero-location"><span aria-hidden="true" />BUGEMA · UGANDA</div>
          <h1 id="hospital-hero-title">{words.join(' ')} <span>{accent}</span></h1>
          <div className="hero-rule" aria-hidden="true"><span /><span /><span /></div>
          <p className="lead">{s.heroText}</p>
          <div className="actions hero-actions">
            <a className="button reference-call" href={'tel:'+s.phone}><Phone size={17} aria-hidden="true"/>Call the Hospital</a>
            <Link className="button reference-appointment" href="/appointments">Request an Appointment<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="hero-urgent"><span className="urgent-icon"><Phone size={20} aria-hidden="true" /></span><div><span>Need urgent assistance?</span><a href={'tel:' + s.emergency}>{s.emergency}</a><small>For emergencies, call directly. Online forms are not emergency services.</small></div></div>
        </div>
        <div className="hero-visual">
          <StethoscopeScene/>
          <a className="reference-contact-orb orb-phone" href={'tel:'+s.phone} aria-label="Call the hospital"><Phone size={23} aria-hidden="true"/></a>
          <a className="reference-contact-orb orb-email" href={'mailto:'+s.email} aria-label="Email the hospital"><Mail size={23} aria-hidden="true"/></a>
          <Link className="reference-contact-orb orb-location" href="/contact" aria-label="Hospital location and directions"><MapPin size={23} aria-hidden="true"/></Link>
          <div className="reference-address"><span className="reference-address-icon"><MapPin size={17} aria-hidden="true"/></span><div><strong>Find us in Bugema</strong><span>{s.address}</span></div></div>
          <a className="reference-phone-label" href={'tel:'+s.phone}><Phone size={17} aria-hidden="true"/><span><small>Hospital contact</small><strong>{s.phone}</strong></span></a>
        </div>
      </div>
    </section>
    <nav className="container patient-pathways" aria-label="Patient quick links">
      {[{ href: '/departments', number: '01', icon: Stethoscope, title: 'Find a department', detail: 'Explore departments & services' }, { href: '/doctors', number: '02', icon: ClipboardList, title: 'Find a doctor', detail: 'View published doctor profiles' }, { href: '/patient-information', number: '03', icon: CalendarDays, title: 'Before your visit', detail: 'Patient & visitor information' }].map(item => <Link href={item.href} key={item.href}><span className="pathway-number">{item.number}</span><item.icon size={24} strokeWidth={1.6} aria-hidden="true" /><span className="pathway-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight className="pathway-arrow" size={19} aria-hidden="true" /></Link>)}
    </nav>
  </>;
}
