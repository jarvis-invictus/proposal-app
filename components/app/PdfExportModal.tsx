'use client';
import * as React from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { FilterChip } from '../ui/FilterChip';
import { Switch } from '../ui/Switch';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const toDate=(d:Date|string)=>d instanceof Date?d:new Date(d);
const pad=(n:number)=>String(n).padStart(2,'0');

export type PageCorner = 'tl' | 'tr' | 'bl' | 'br' | 'none';
export type DateFields = 'both' | 'issued' | 'valid' | 'none';
export type DateFormat = 'long' | 'us' | 'iso' | 'custom';

/** The three presets the export offers, plus whatever the user types. */
export function formatDate(d:Date|string,mode:DateFormat,custom?:string):string{
  const t=toDate(d);if(isNaN(t.getTime()))return '';
  if(mode==='custom')return custom||'';
  if(mode==='us')return pad(t.getMonth()+1)+'/'+pad(t.getDate())+'/'+t.getFullYear();
  if(mode==='iso')return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());
  return t.getDate()+' '+MONTHS[t.getMonth()]+' '+t.getFullYear();
}

const DEFAULT_SECTIONS=[
  {id:'summary',label:'Executive summary'},{id:'scope',label:'Scope of work'},
  {id:'packages',label:'Packages'},{id:'addons',label:'Add-ons'},
  {id:'terms',label:'Terms'},{id:'payment',label:'Payment schedule'}
];

export interface PdfExportOptions {
  /** Resolved header — the proposal title when the field was left blank. */
  header: string;
  headerIsDefault: boolean;
  pageNumbers: PageCorner;
  dates: DateFields;
  dateFormat: DateFormat;
  customDateFormat: string;
  /** Section ids omitted from THIS export only. The proposal keeps them. */
  hiddenSections: string[];
  /** Suppress line items, print package totals only. */
  totalOnly: boolean;
  /** Strip background tints for print. */
  inkSaving: boolean;
}

/**
 * Export options for one proposal's PDF, opened from Publish → Download PDF or from an
 * already-published proposal. Downstream of the Editor: it renders whatever content and
 * accent the proposal is carrying at export time and writes nothing back.
 * @startingPoint section="App" subtitle="PDF export options with a live page preview" viewport="820x560"
 */
export interface PdfExportModalProps {
  open?: boolean;
  onClose?: () => void;
  /** Fires with the resolved option set. */
  onExport?: (options: PdfExportOptions) => void;
  /** Proposal title. Also the placeholder and fallback for the header field. */
  title?: string;
  /** The proposal's current accent — from the Brand Kit or a Theme Color override. */
  accent?: string;
  sections?: Array<{ id: string; label: string }>;
  pages?: number;
  issued?: Date | string;
  validUntil?: Date | string;
}

export function PdfExportModal({
  open=true,onClose,onExport,
  title='Untitled proposal',accent='#171717',
  sections=DEFAULT_SECTIONS,pages=4,
  issued=new Date(),validUntil=new Date(Date.now()+30*864e5),
  ...rest
}:PdfExportModalProps){
  const [header,setHeader]=React.useState('');
  const [corner,setCorner]=React.useState<PageCorner>('br');
  const [dates,setDates]=React.useState<DateFields>('both');
  const [fmt,setFmt]=React.useState<DateFormat>('long');
  const [custom,setCustom]=React.useState('');
  const [hidden,setHidden]=React.useState<Record<string,boolean>>({addons:true});
  const [totalOnly,setTotalOnly]=React.useState(false);
  const [ink,setInk]=React.useState(false);

  const headerText=header.trim()||title;
  const hiddenCount=sections.filter(s=>hidden[s.id]).length;
  const dateLine=[
    dates==='both'||dates==='issued'?'Issued '+formatDate(issued,fmt,custom):null,
    dates==='both'||dates==='valid'?'Valid until '+formatDate(validUntil,fmt,custom):null
  ].filter(Boolean).join('  ·  ');

  const opts:PdfExportOptions={header:headerText,headerIsDefault:!header.trim(),pageNumbers:corner,dates,dateFormat:fmt,
    customDateFormat:custom,hiddenSections:sections.filter(s=>hidden[s.id]).map(s=>s.id),totalOnly,inkSaving:ink};

  return (
    <Modal {...rest} open={open} onClose={onClose} eyebrow="Export" title="PDF options" width={800}
      footer={<>
        <span style={{fontSize:'var(--text-xs)',color:'var(--text-muted)'}}>
          Exports the proposal exactly as it stands now.</span>
        <span style={{flex:1}}/>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="file-down" onClick={()=>onExport?onExport(opts):onClose&&onClose()}>Download PDF</Button>
      </>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 236px',gap:24,alignItems:'start'}}>

        <div style={{display:'flex',flexDirection:'column',gap:16,maxHeight:340,overflowY:'auto',paddingRight:4}}>
          <Field label="Header" hint="Repeats at the top of every page.">
            <input value={header} onChange={e=>setHeader(e.target.value)} placeholder={title}
              style={{width:'100%',height:34,padding:'0 11px',borderRadius:'var(--radius-sm)',
                border:'1px solid var(--border-hairline)',background:'var(--surface-card)',outline:'none',
                fontFamily:'var(--font-sans)',fontSize:'var(--text-sm)',color:'var(--text-primary)'}}/>
          </Field>

          <Field label="Page numbers">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <CornerPicker value={corner} onChange={setCorner}/>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <span style={{fontSize:'var(--text-sm)',color:'var(--text-secondary)'}}>
                  {corner==='none'?'No page numbers':CORNER_LABEL[corner]}</span>
                <FilterChip size="sm" active={corner==='none'} onClick={()=>setCorner(corner==='none'?'br':'none')}>
                  {corner==='none'?'Turn on':'None'}</FilterChip>
              </div>
            </div>
          </Field>

          <Field label="Dates">
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {([['both','Issued + valid until'],['issued','Issued only'],['valid','Valid until only'],['none','None']] as [DateFields,string][])
                .map(([v,l])=><FilterChip key={v} size="sm" active={dates===v} onClick={()=>setDates(v)}>{l}</FilterChip>)}
            </div>
            {dates!=='none'&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {([['long',formatDate(issued,'long')],['us',formatDate(issued,'us')],['iso',formatDate(issued,'iso')],['custom','Custom']] as [DateFormat,string][])
                  .map(([v,l])=><FilterChip key={v} size="sm" active={fmt===v} onClick={()=>setFmt(v)}
                    style={v==='custom'?undefined:{fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)'}}>{l}</FilterChip>)}
                {fmt==='custom'&&(
                  <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="e.g. Q4 2026"
                    style={{flex:1,minWidth:120,height:28,padding:'0 10px',borderRadius:'var(--radius-pill)',
                      border:'1px solid var(--brand)',background:'var(--surface-card)',outline:'none',
                      fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',color:'var(--text-primary)'}}/>
                )}
              </div>
            )}
          </Field>

          <Field label="Sections" hint={hiddenCount?hiddenCount+' hidden from this export only.':'All included.'}>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              {sections.map(s=>{
                const off=!!hidden[s.id];
                return (
                  <button key={s.id} type="button" onClick={()=>setHidden(h=>({...h,[s.id]:!off}))}
                    style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'7px 9px',border:'none',
                      borderRadius:'var(--radius-xs)',background:'transparent',cursor:'pointer',textAlign:'left',
                      fontFamily:'var(--font-sans)',fontSize:'var(--text-sm)',
                      color:off?'var(--text-muted)':'var(--text-primary)'}}>
                    <Icon name={off?'eye-off':'eye'} size={15} color={off?'var(--text-muted)':'var(--brand-deep)'}/>
                    <span style={{flex:1,textDecoration:off?'line-through':'none'}}>{s.label}</span>
                    {off&&<span style={{fontSize:'var(--text-micro)',color:'var(--text-muted)'}}>Hidden</span>}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Pricing">
            <Switch checked={totalOnly} onChange={()=>setTotalOnly(v=>!v)}
              label="Hide line-item prices" hint="Each package shows its total only."/>
          </Field>

          <Field label="Printing">
            <Switch checked={ink} onChange={()=>setInk(v=>!v)}
              label="Ink-saving mode" hint="Strips background colours and tints. Accent stays on rules and headings."/>
          </Field>
        </div>

        <div style={{position:'sticky',top:0}}>
          <div className="eyebrow" style={{marginBottom:8}}>Preview</div>
          <PagePreview header={headerText} corner={corner} dateLine={dateLine} accent={ink?'#171717':accent}
            sections={sections.filter(s=>!hidden[s.id])} totalOnly={totalOnly} ink={ink} pages={pages}/>
          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:6,fontSize:'var(--text-micro)',color:'var(--text-muted)'}}>
            <Icon name="file-text" size={12}/>{pages} pages · Letter
          </div>
        </div>
      </div>
    </Modal>
  );
}

const CORNER_LABEL:Record<'tl'|'tr'|'bl'|'br',string>={tl:'Top left',tr:'Top right',bl:'Bottom left',br:'Bottom right'};

interface CornerPickerProps { value:PageCorner; onChange:(k:'tl'|'tr'|'bl'|'br')=>void }

/** The page itself is the control — four corners on a sheet, not a dropdown of words. */
function CornerPicker({value,onChange}:CornerPickerProps){
  return (
    <div style={{position:'relative',width:56,height:72,flex:'none',borderRadius:'var(--radius-xs)',
      background:'var(--surface-card)',border:'1px solid var(--border-strong)'}}>
      <span style={{position:'absolute',left:9,right:9,top:24,height:1,background:'var(--ink-10)'}}/>
      <span style={{position:'absolute',left:9,right:16,top:31,height:1,background:'var(--ink-10)'}}/>
      <span style={{position:'absolute',left:9,right:20,top:38,height:1,background:'var(--ink-10)'}}/>
      {(Object.keys(CORNER_LABEL) as Array<'tl'|'tr'|'bl'|'br'>).map(k=>{
        const on=value===k,top=k[0]==='t';
        return (
          <button key={k} type="button" aria-label={CORNER_LABEL[k]} title={CORNER_LABEL[k]} onClick={()=>onChange(k)}
            style={{position:'absolute',width:16,height:12,padding:0,cursor:'pointer',
              [top?'top':'bottom']:4,[k[1]==='l'?'left':'right']:4,
              borderRadius:3,border:'1px solid '+(on?'var(--brand-deep)':'var(--border-hairline)'),
              background:on?'var(--brand-deep)':'var(--ink-04)',
              transition:'background var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)'}}/>
        );
      })}
    </div>
  );
}

interface FieldProps { label:string; hint?:string; children:React.ReactNode }

function Field({label,hint,children}:FieldProps){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
        <span className="eyebrow">{label}</span>
        {hint&&<span style={{fontSize:'var(--text-micro)',color:'var(--text-muted)'}}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const LINES:[number,string][]=[[3,'92%'],[3,'99%'],[3,'78%']];

interface PagePreviewProps {
  header:string; corner:PageCorner; dateLine:string; accent:string;
  sections:Array<{id:string;label:string}>; totalOnly:boolean; ink:boolean; pages:number;
}

/** Always opaque white paper, always .force-light — matches the printed/exported PDF exactly. */
function PagePreview({header,corner,dateLine,accent,sections,totalOnly,ink,pages}:PagePreviewProps){
  const num=corner!=='none';
  return (
    <div className="force-light" style={{position:'relative',aspectRatio:'8.5 / 11',padding:'12px 13px',
      display:'flex',flexDirection:'column',borderRadius:'var(--radius-sm)',background:'#ffffff',
      border:'1px solid var(--border-hairline)',boxShadow:'var(--shadow-hover)',overflow:'hidden'}}>
      <div style={{fontSize:6,color:'#6b7280',paddingBottom:5,marginBottom:8,whiteSpace:'nowrap',overflow:'hidden',
        textOverflow:'ellipsis',borderBottom:'1px solid '+(ink?'rgba(23,23,23,0.14)':accent)}}>{header}</div>
      {dateLine&&<div style={{fontSize:5.5,fontFamily:'var(--font-mono)',color:'#6b7280',marginBottom:9}}>{dateLine}</div>}

      <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:9,overflow:'hidden'}}>
        {sections.slice(0,4).map((s,i)=>(
          <div key={s.id} style={{display:'flex',flexDirection:'column',gap:4}}>
            <span style={{fontFamily:'var(--font-serif)',fontStyle:'italic',fontSize:8.5,color:accent}}>{s.label}</span>
            {i===2
              ?<div style={{display:'flex',flexDirection:'column',gap:3,padding:totalOnly?0:'5px 6px',
                  borderRadius:3,background:ink||totalOnly?'transparent':'rgba(23,23,23,0.035)'}}>
                 {!totalOnly&&['Discovery','Design system','Handover'].map(l=>(
                   <span key={l} style={{display:'flex',justifyContent:'space-between',fontSize:5.5,color:'#3d4451'}}>
                     <span>{l}</span><span style={{fontFamily:'var(--font-mono)'}}>$0,000</span></span>
                 ))}
                 <span style={{display:'flex',justifyContent:'space-between',fontSize:6,fontWeight:600,color:'#171717',
                   paddingTop:totalOnly?0:3,borderTop:totalOnly?'none':'1px solid rgba(23,23,23,0.10)'}}>
                   <span>Total</span><span style={{fontFamily:'var(--font-mono)',color:accent}}>$18,500</span></span>
               </div>
              :LINES.map(([h,w],k)=><span key={k} style={{height:h,width:w,borderRadius:2,background:'rgba(23,23,23,0.09)'}}/>)}
          </div>
        ))}
      </div>

      {num&&(
        <span style={{position:'absolute',fontSize:5.5,fontFamily:'var(--font-mono)',color:'#6b7280',
          [corner[0]==='t'?'top':'bottom']:7,[corner[1]==='l'?'left':'right']:13}}>1 / {pages}</span>
      )}
    </div>
  );
}

/** Date presets used by the export, reachable from consuming projects. */
export const PdfExport={formatDate};
