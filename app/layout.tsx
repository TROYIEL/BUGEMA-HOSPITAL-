import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={metadataBase:new URL(process.env.SITE_URL||'https://bugema-university-hospital.tuhirirwetroynajuna.chatgpt.site'),title:{default:'Bugema University Hospital',template:'%s | Bugema University Hospital'},description:'Hospital information, departments, doctor profiles and appointment requests. Bugema Gazaya Zirobwe Road.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
