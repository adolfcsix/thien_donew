'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SavedChart} from '@thiendo/shared-types';
import {api,chartApi} from '@/lib/api';
import {RequestScope} from './request-scope';
import {checked,statusResponse,listResponse,historyResponse,disclosureResponse,generationResponse} from './response-contract';
import type {AiStatus,Answer,Conversation,Disclosure,History,Message} from './types';

/** A workspace is mounted with a user ID key; private state never crosses accounts. */
export function useHuyenGiai() {
  const scopes = useRef({catalog:new RequestScope(),history:new RequestScope(),mutation:new RequestScope()}).current;
  const [charts,setCharts] = useState<SavedChart[]>([]);
  const [conversations,setConversations] = useState<Conversation[]>([]);
  const [status,setStatus] = useState<AiStatus|null>(null);
  const [catalogLoading,setCatalogLoading] = useState(true), [catalogError,setCatalogError] = useState('');
  const [selection,setSelection] = useState<{chartId:string;conversationId:string|null}>({chartId:'',conversationId:null});
  const {chartId,conversationId} = selection;
  const [mode,setMode] = useState<'basic'|'expert'>('basic'), [topic,setTopic] = useState('overview');
  const [question,setQuestion] = useState(''), [messages,setMessages] = useState<Message[]>([]);
  const [disclosure,setDisclosure] = useState<Disclosure|null>(null), [disclosureError,setDisclosureError] = useState('');
  const [disclosureRetry,setDisclosureRetry] = useState(0), [consent,setConsent] = useState(false);
  const [busy,setBusy] = useState(false), [historyLoading,setHistoryLoading] = useState(false);
  const [error,setError] = useState(''), [notice,setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (scopes.mutation.pending) return;
    const signal = scopes.catalog.replace();
    setCatalogLoading(true); setCatalogError('');
    try {
      const [c,s,h] = await Promise.all([
        chartApi.list(signal),
        api<unknown>('/api/huyen-giai/status',{signal,timeoutMs:15000}).then(value=>checked<AiStatus>(value,statusResponse)),
        api<unknown>('/api/huyen-giai/conversations',{signal,timeoutMs:15000}).then(value=>checked<{conversations:Conversation[]}>(value,listResponse)),
      ]);
      if (!scopes.catalog.owns(signal)) return;
      setCharts(c.charts); setStatus(s); setConversations(h.conversations);
      setSelection(current => ({...current,chartId:c.charts.some(chart=>chart.id===current.chartId)
        ? current.chartId : current.conversationId ? '' : c.charts[0]?.id || ''}));
    } catch (reason) {
      if (scopes.catalog.owns(signal)) setCatalogError((reason as Error).message);
    } finally {
      if (scopes.catalog.owns(signal)) { setCatalogLoading(false); scopes.catalog.cancel(); }
    }
  },[scopes]);

  useEffect(() => {
    void refresh();
    return () => { scopes.catalog.cancel(); scopes.history.cancel(); scopes.mutation.cancel(); };
  },[refresh,scopes]);

  useEffect(() => {
    setDisclosure(null); setConsent(false); setDisclosureError('');
    if (!chartId) return;
    const request = new AbortController();
    void api<Disclosure>('/api/huyen-giai/disclosure/'+encodeURIComponent(chartId),{signal:request.signal,timeoutMs:15000})
      .then(result => { const verified=checked<Disclosure>(result,disclosureResponse); if (!request.signal.aborted) setDisclosure(verified); })
      .catch(reason => { if (!request.signal.aborted) setDisclosureError((reason as Error).message); });
    return () => request.abort();
  },[chartId,disclosureRetry]);

  function chooseChart(id:string) {
    if (scopes.mutation.pending || scopes.history.pending) return;
    setDisclosure(null); setConsent(false); setSelection(current=>({...current,chartId:id})); setMessages([]); setError('');
  }

  async function openConversation(id:string) {
    if (scopes.mutation.pending) return;
    const signal = scopes.history.replace();
    setHistoryLoading(true); setError(''); setNotice(''); setMessages([]); setConsent(false);
    try {
      const history = checked<History>(await api<unknown>('/api/huyen-giai/conversations/'+encodeURIComponent(id),{signal,timeoutMs:15000}),value=>historyResponse(value,id));
      if (!scopes.history.owns(signal)) return;
      setSelection({conversationId:history.conversation.id,chartId:history.conversation.chartId || ''});
      setMode(history.conversation.mode); setTopic(history.conversation.topic); setMessages(history.messages); setQuestion('');
    } catch (reason) {
      if (scopes.history.owns(signal)) setError((reason as Error).message);
    } finally {
      if (scopes.history.owns(signal)) { scopes.history.finish(signal); setHistoryLoading(false); }
    }
  }

  function reset() {
    if (scopes.mutation.pending) return;
    scopes.history.cancel(); setHistoryLoading(false); setMessages([]);
    setSelection({conversationId:null,chartId:charts.some(chart => chart.id === chartId) ? chartId : charts[0]?.id || ''});
    setConsent(false); setQuestion(''); setTopic('overview'); setError(''); setNotice('Bắt đầu cuộc luận giải mới.');
  }

  async function generate() {
    if (!chartId || !consent || !disclosure || !status?.ai.enabled || catalogLoading || catalogError ||
        scopes.history.pending || question.trim().length < 4) return;
    const signal = scopes.mutation.tryStart();
    if (!signal) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = checked<{conversationId:string;answerId:string;answer:Answer;factsSha256?:string}>(await api<unknown>(
        '/api/huyen-giai/generate',{method:'POST',body:{chartId,conversationId,question,topic,mode,consent:true},signal,timeoutMs:42000}),generationResponse);
      if (!scopes.mutation.owns(signal)) return;
      setSelection(current=>({...current,conversationId:response.conversationId}));
      setMessages(old => [...old,{id:response.answerId,factsSha256:response.factsSha256,question,response:response.answer,engineRevision:disclosure.factPack.ruleSet,createdAt:new Date().toISOString()}]);
      setQuestion(''); setNotice('Đã lưu bản luận giải.');
      setStatus(current=>current&&typeof current.limits.usedToday==='number'?{...current,limits:{...current.limits,usedToday:current.limits.usedToday+1,remainingToday:Math.max(0,(current.limits.remainingToday||0)-1)}}:current);
      try {
        const history = await api<unknown>('/api/huyen-giai/conversations',{signal,timeoutMs:15000}).then(value=>checked<{conversations:Conversation[]}>(value,listResponse));
        if (scopes.mutation.owns(signal)) setConversations(history.conversations);
      } catch {
        if (scopes.mutation.owns(signal)) setNotice('Đã lưu bản luận giải; chưa tải lại được danh sách lịch sử. Hãy bấm Làm mới dữ liệu AI.');
      }
    } catch (reason) {
      if (scopes.mutation.owns(signal)) setError((reason as Error).message+' Nếu kết nối gián đoạn, hãy xem lịch sử trước khi gửi lại.');
    } finally {
      if (scopes.mutation.owns(signal)) { scopes.mutation.finish(signal); setBusy(false); }
    }
  }

  async function rate(messageId:string,helpful:boolean) {
    const signal = scopes.mutation.tryStart();
    if (!signal) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const receipt=await api<{saved?:boolean}>('/api/huyen-giai/feedback/'+encodeURIComponent(messageId),{method:'POST',body:{helpful},signal,timeoutMs:15000});
      if(receipt.saved!==true) throw new Error('Chưa xác nhận được việc lưu phản hồi.');
      if (scopes.mutation.owns(signal)) setNotice('Đã ghi nhận phản hồi chất lượng.');
    } catch (reason) {
      if (scopes.mutation.owns(signal)) setError((reason as Error).message);
    } finally {
      if (scopes.mutation.owns(signal)) { scopes.mutation.finish(signal); setBusy(false); }
    }
  }

  async function removeConversation(id:string) {
    if (scopes.mutation.pending || !confirm('Xóa vĩnh viễn cuộc luận giải này?')) return;
    const signal = scopes.mutation.tryStart();
    if (!signal) return;
    scopes.history.cancel(); setHistoryLoading(false); setBusy(true); setError(''); setNotice('');
    try {
      const receipt=await api<{deleted?:boolean}>('/api/huyen-giai/conversations/'+encodeURIComponent(id),{method:'DELETE',signal,timeoutMs:15000});
      if(receipt.deleted!==true) throw new Error('Chưa xác nhận được việc xóa. Hãy làm mới lịch sử để kiểm tra.');
      if (!scopes.mutation.owns(signal)) return;
      setConversations(items => items.filter(item => item.id !== id));
      if (id === conversationId) { setSelection(current=>({...current,conversationId:null})); setMessages([]); setConsent(false); setQuestion(''); }
      setNotice('Đã xóa cuộc luận giải.');
    } catch (reason) {
      if (scopes.mutation.owns(signal)) setError((reason as Error).message);
    } finally {
      if (scopes.mutation.owns(signal)) { scopes.mutation.finish(signal); setBusy(false); }
    }
  }

  return {charts,conversations,status,catalogLoading,catalogError,refresh,chartId,chooseChart,conversationId,
    mode,setMode,topic,setTopic,question,setQuestion,messages,disclosure,disclosureError,
    retryDisclosure:() => { setConsent(false); setDisclosure(null); setDisclosureRetry(value => value+1); },
    consent,setConsent,busy,historyLoading,error,notice,openConversation,reset,generate,rate,removeConversation};
}
