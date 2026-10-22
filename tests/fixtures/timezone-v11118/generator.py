import urllib.request,tarfile,io,hashlib,subprocess,json,datetime,pathlib,zoneinfo,argparse
parser=argparse.ArgumentParser();parser.add_argument("--work-dir",required=True);parser.add_argument("--out-dir",default=str(pathlib.Path(__file__).parent));args=parser.parse_args()
root=pathlib.Path(args.work_dir);root.mkdir(parents=True,exist_ok=True);src=root/'tzdata-2026e';src.mkdir(exist_ok=True)
url='https://data.iana.org/time-zones/releases/tzdata2026e.tar.gz'
raw=urllib.request.urlopen(url,timeout=40).read();(root/'tzdata2026e.tar.gz').write_bytes(raw)
with tarfile.open(fileobj=io.BytesIO(raw)) as t:
 for name in ['africa','antarctica','asia','australasia','europe','northamerica','southamerica','etcetera','backward','version','theory.html','LICENSE']:
  (src/name).write_bytes(t.extractfile(name).read())
compiled=root/'compiled';subprocess.run(['/usr/sbin/zic','-b','fat','-d',str(compiled)]+[str(src/n) for n in ['africa','antarctica','asia','australasia','europe','northamerica','southamerica','etcetera','backward']],check=True)
cases=[('America/New_York','2012-03-11',1,59),('America/New_York','2012-03-11',2,0),('America/New_York','2012-03-11',3,0),('America/New_York','2012-11-04',1,30),('America/New_York','2012-11-04',2,0),('America/New_York','2006-03-12',2,30),('America/New_York','2007-03-11',2,30),('Europe/London','2026-03-29',1,30),('Europe/London','2026-10-25',1,30),('Australia/Sydney','2026-01-01',12,0),('Australia/Sydney','2026-07-01',12,0),('Australia/Lord_Howe','2026-04-05',1,45),('Australia/Lord_Howe','2026-10-04',2,15),('Pacific/Apia','2011-12-30',12,0),('Asia/Kathmandu','1985-12-31',23,59),('Asia/Kathmandu','1986-01-01',0,5),('Asia/Kathmandu','1986-01-01',0,15),('Europe/Paris','1900-06-01',12,0),('Asia/Ho_Chi_Minh','1900-06-01',12,0),('Asia/Ho_Chi_Minh','1960-01-01',12,0),('Asia/Bangkok','1970-01-01',12,0),('Asia/Ho_Chi_Minh','1970-01-01',12,0),('Asia/Ho_Chi_Minh','1975-06-13',0,30),('Asia/Ho_Chi_Minh','2000-01-01',19,0),('Etc/GMT+5','2000-01-01',7,0),('Pacific/Chatham','2026-01-01',12,0),('Africa/Casablanca','2026-03-01',12,0),('America/New_York','2100-11-07',1,30)]
fixtures=[]
for name,date,hour,minute in cases:
 with (compiled/name).open('rb') as f:tz=zoneinfo.ZoneInfo.from_file(f,key=name)
 wall=datetime.datetime.fromisoformat(date).replace(hour=hour,minute=minute);found={}
 for fold in [0,1]:
  aware=wall.replace(tzinfo=tz,fold=fold);utc=aware.astimezone(datetime.timezone.utc)
  if utc.astimezone(tz).replace(tzinfo=None)==wall:found[utc.isoformat(timespec='milliseconds').replace('+00:00','Z')]={'utc':utc.isoformat(timespec='milliseconds').replace('+00:00','Z'),'offsetSeconds':int(aware.utcoffset().total_seconds())}
 fixtures.append({'timeZone':name,'date':date,'hour':hour,'minute':minute,'candidates':[found[k] for k in sorted(found)]})
out=pathlib.Path(args.out_dir);out.mkdir(parents=True,exist_ok=True)
(out/'iana-python-zoneinfo.json').write_text(json.dumps({'provenance':{'tzdbVersion':'2026e','source':url,'tarSha256':hashlib.sha256(raw).hexdigest(),'compiler':subprocess.check_output(['/usr/sbin/zic','--version'],text=True).strip(),'reader':'Python 3 standard-library zoneinfo.ZoneInfo.from_file; both folds + UTC round-trip','limitations':'Independent implementation over same IANA model; not independent proof of historical local practice. Standard zones, no backzone reconstruction.'},'fixtures':fixtures},ensure_ascii=False,indent=2)+'\n')
out.mkdir(parents=True,exist_ok=True)
(out/'IANA_LICENSE.txt').write_bytes((src/'LICENSE').read_bytes())
print('Generated',len(fixtures),'independent timezone fixtures')
