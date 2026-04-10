import { useEffect, useState } from 'react'
import { PlatformIconRow } from '../components/PlatformIcon'
import { listScheduled, subscribe } from '../store/db.js'
import { nice } from '../utils/time.js'


export default function Calendar() {
const [scheduled, setScheduled] = useState(listScheduled().sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)))


useEffect(() => {
const unsub = subscribe(() => setScheduled(listScheduled().sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt))))
return unsub
}, [])


return (
<section className="panel">
<h2>Calendar</h2>
{scheduled.length === 0 ? (
<p className="small">Nothing scheduled yet.</p>
) : (
<table className="table">
<thead><tr><th>When</th><th>Platform</th><th>Caption</th></tr></thead>
<tbody>
{scheduled.map(s => (
<tr key={s.id}><td>{nice(s.scheduledAt)}</td><td><PlatformIconRow platforms={s.platform} badge iconClassName="h-3.5 w-3.5" /></td><td className="small">{s.caption}</td></tr>
))}
</tbody>
</table>
)}
</section>
)
}