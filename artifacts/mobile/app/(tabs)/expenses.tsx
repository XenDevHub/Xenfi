import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Platform, Modal,
  TextInput, Alert, Dimensions, KeyboardAvoidingView, Animated,
  FlatList, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApi } from '@/hooks/useApi';

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type Period = 'day' | 'week' | 'month' | 'year' | 'all';
type ViewMode = 'chart' | 'list';

interface Expense {
  id: number; txType: string; amount: number; category: string;
  currency: string; description: string; date: string;
  entityType: string; entityId: number | null;
}
interface CustomCategory { id: number; name: string; icon: string; color: string; txType: string; entityType: string; entityId: number | null }
interface CurrencyRow { id: number; code: string; symbol: string; name: string; isDefault: boolean }
interface Business { id: number; name: string; type: string; color: string; icon: string; description: string }

// ─────────────────────────────────────────
// PRESET CATEGORIES (6 essential only)
// ─────────────────────────────────────────
const PRESET_CATEGORIES = [
  { id: 'food',          name: 'Food',          icon: 'coffee',       color: '#F09050', txType: 'expense' },
  { id: 'transport',     name: 'Transport',     icon: 'navigation',   color: '#5B8DB8', txType: 'expense' },
  { id: 'bills',         name: 'Bills',         icon: 'zap',          color: '#F0C060', txType: 'expense' },
  { id: 'shopping',      name: 'Shopping',      icon: 'shopping-bag', color: '#C8A0E8', txType: 'expense' },
  { id: 'health',        name: 'Health',        icon: 'heart',        color: '#E87070', txType: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film',         color: '#E8A070', txType: 'expense' },
  { id: 'salary',        name: 'Salary',        icon: 'dollar-sign',  color: '#50C878', txType: 'income'  },
];

// ─────────────────────────────────────────
// CATEGORY LIBRARY (browse & add)
// ─────────────────────────────────────────
const CATEGORY_LIBRARY = [
  { section: 'Lifestyle',  items: [
    { name: 'Coffee',      icon: 'coffee',      color: '#C87D50', txType: 'expense' },
    { name: 'Beauty',      icon: 'eye',         color: '#E888B8', txType: 'expense' },
    { name: 'Sports',      icon: 'zap',         color: '#70C8A0', txType: 'expense' },
    { name: 'Pets',        icon: 'heart',       color: '#88D888', txType: 'expense' },
    { name: 'Hobbies',     icon: 'star',        color: '#D4AF37', txType: 'expense' },
    { name: 'Dating',      icon: 'users',       color: '#E87090', txType: 'expense' },
  ]},
  { section: 'Home', items: [
    { name: 'Rent',        icon: 'home',        color: '#7AB8E8', txType: 'expense' },
    { name: 'Furniture',   icon: 'package',     color: '#A08060', txType: 'expense' },
    { name: 'Repairs',     icon: 'tool',        color: '#9090C8', txType: 'expense' },
    { name: 'Cleaning',    icon: 'wind',        color: '#80C8D0', txType: 'expense' },
    { name: 'Garden',      icon: 'sun',         color: '#88C870', txType: 'expense' },
  ]},
  { section: 'Finance', items: [
    { name: 'Investment',  icon: 'trending-up', color: '#50B8D8', txType: 'expense' },
    { name: 'Insurance',   icon: 'shield',      color: '#9090A8', txType: 'expense' },
    { name: 'Tax',         icon: 'file-text',   color: '#C87070', txType: 'expense' },
    { name: 'Savings',     icon: 'archive',     color: '#4090D8', txType: 'income'  },
    { name: 'Returns',     icon: 'trending-up', color: '#50C878', txType: 'income'  },
  ]},
  { section: 'Travel', items: [
    { name: 'Hotel',       icon: 'map-pin',     color: '#E8C050', txType: 'expense' },
    { name: 'Flight',      icon: 'send',        color: '#5898E8', txType: 'expense' },
    { name: 'Vacation',    icon: 'umbrella',    color: '#F09090', txType: 'expense' },
    { name: 'Taxi',        icon: 'truck',       color: '#F0D060', txType: 'expense' },
  ]},
  { section: 'Work', items: [
    { name: 'Office',      icon: 'monitor',     color: '#8898B8', txType: 'expense' },
    { name: 'Training',    icon: 'book-open',   color: '#70A8D8', txType: 'expense' },
    { name: 'Software',    icon: 'code',        color: '#7868C8', txType: 'expense' },
    { name: 'Equipment',   icon: 'cpu',         color: '#98A8C8', txType: 'expense' },
  ]},
  { section: 'Family', items: [
    { name: 'Education',   icon: 'book',        color: '#78B8E8', txType: 'expense' },
    { name: 'Childcare',   icon: 'users',       color: '#E8B878', txType: 'expense' },
    { name: 'Gift',        icon: 'gift',        color: '#E8A0C0', txType: 'expense' },
    { name: 'Charity',     icon: 'heart',       color: '#F08080', txType: 'expense' },
  ]},
  { section: 'Business Income', items: [
    { name: 'Revenue',     icon: 'briefcase',   color: '#50D878', txType: 'income'  },
    { name: 'Freelance',   icon: 'user-check',  color: '#50C8A8', txType: 'income'  },
    { name: 'Dividends',   icon: 'percent',     color: '#D4AF37', txType: 'income'  },
    { name: 'Commission',  icon: 'award',       color: '#A8D870', txType: 'income'  },
  ]},
  { section: 'Business Expense', items: [
    { name: 'Marketing',   icon: 'bar-chart-2', color: '#8058C8', txType: 'expense' },
    { name: 'Staff',       icon: 'users',       color: '#5090C8', txType: 'expense' },
    { name: 'Inventory',   icon: 'box',         color: '#C89050', txType: 'expense' },
    { name: 'Logistics',   icon: 'truck',       color: '#7898B8', txType: 'expense' },
    { name: 'Advertising', icon: 'radio',       color: '#E870A0', txType: 'expense' },
  ]},
];

const BUSINESS_TYPES = [
  { label: 'E-commerce',   icon: 'shopping-cart', color: '#C8A0E8' },
  { label: 'Consulting',   icon: 'briefcase',     color: '#5B8DB8' },
  { label: 'Freelance',    icon: 'user-check',    color: '#50C878' },
  { label: 'Restaurant',   icon: 'coffee',        color: '#F09050' },
  { label: 'Retail',       icon: 'shopping-bag',  color: '#E8A0C0' },
  { label: 'Technology',   icon: 'monitor',       color: '#7868C8' },
  { label: 'Real Estate',  icon: 'home',          color: '#7AB8E8' },
  { label: 'Healthcare',   icon: 'activity',      color: '#E87070' },
  { label: 'Finance',      icon: 'trending-up',   color: '#D4AF37' },
  { label: 'General',      icon: 'layers',        color: '#9090C8' },
];

const BUSINESS_COLORS = [
  '#D4AF37','#E87070','#50C878','#5B8DB8','#C8A0E8',
  '#F09050','#50B8D8','#E8A0C0','#88D888','#9090C8',
];

const PRESET_CURRENCIES = [
  { code:'USD',symbol:'$',name:'US Dollar' },{ code:'EUR',symbol:'€',name:'Euro' },
  { code:'GBP',symbol:'£',name:'British Pound' },{ code:'BDT',symbol:'৳',name:'Bangladeshi Taka' },
  { code:'JPY',symbol:'¥',name:'Japanese Yen' },{ code:'AED',symbol:'د.إ',name:'UAE Dirham' },
  { code:'INR',symbol:'₹',name:'Indian Rupee' },{ code:'CAD',symbol:'CA$',name:'Canadian Dollar' },
  { code:'AUD',symbol:'A$',name:'Australian Dollar' },{ code:'SGD',symbol:'S$',name:'Singapore Dollar' },
];

// ─────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────
const CHART_R = Math.min(SW * 0.24, 90);
const STROKE = 22;
function DonutChart({ income, expense, data, symbol }: { income:number; expense:number; data:{value:number;color:string}[]; symbol:string }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  const sz = CHART_R*2+STROKE;
  const cx = sz/2;
  const circ = 2*Math.PI*CHART_R;
  let off = 0;
  const segs = data.map((d)=>{
    const dash = total>0?(d.value/total)*circ:0;
    const seg = {dash,offset:circ-off,color:d.color};
    off+=dash; return seg;
  });
  return (
    <View style={{alignItems:'center',justifyContent:'center'}}>
      <Svg width={sz} height={sz}>
        <Circle cx={cx} cy={cx} r={CHART_R} fill="none" stroke={Colors.backgroundTertiary} strokeWidth={STROKE}/>
        {total===0?<Circle cx={cx} cy={cx} r={CHART_R} fill="none" stroke="#1A3050" strokeWidth={STROKE}
          strokeDasharray={`${circ*0.97} ${circ*0.03}`} strokeDashoffset={circ*0.25} strokeLinecap="round"/>
        :segs.map((s,i)=>s.dash>1?<Circle key={i} cx={cx} cy={cx} r={CHART_R} fill="none"
          stroke={s.color} strokeWidth={STROKE} strokeDasharray={`${s.dash-2} ${circ-s.dash+2}`}
          strokeDashoffset={s.offset} strokeLinecap="round" rotation="-90" origin={`${cx},${cx}`}/>:null)}
      </Svg>
      <View style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center'}]}>
        <Text style={s.chartInc}>+{symbol}{income.toLocaleString('en-US',{maximumFractionDigits:0})}</Text>
        <Text style={s.chartExp}>-{symbol}{expense.toLocaleString('en-US',{maximumFractionDigits:0})}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({label,amount,symbol,color,icon}:{label:string;amount:number;symbol:string;color:string;icon:string}) {
  return (
    <View style={[s.statCard,{borderColor:color+'44'}]}>
      <View style={[s.statIcon,{backgroundColor:color+'22'}]}>
        <Feather name={icon as any} size={14} color={color}/>
      </View>
      <Text style={s.statLbl}>{label}</Text>
      <Text style={[s.statAmt,{color}]} numberOfLines={1}>
        {symbol}{Math.abs(amount).toLocaleString('en-US',{maximumFractionDigits:0})}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────
// ENTITY TAB
// ─────────────────────────────────────────
interface Entity { type:'personal'|'business'; id:number|null; name:string; color:string; icon:string }

function EntityTab({entity,active,onPress}:{entity:Entity;active:boolean;onPress:()=>void}) {
  return (
    <Pressable onPress={onPress} style={[s.entityTab,active&&{backgroundColor:entity.color,borderColor:entity.color}]}>
      <View style={[s.entityDot,{backgroundColor:active?Colors.primary:entity.color}]}>
        <Feather name={entity.icon as any} size={11} color={active?entity.color:'rgba(255,255,255,0.6)'}/>
      </View>
      <Text style={[s.entityName,active&&{color:Colors.primary}]} numberOfLines={1}>{entity.name}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────
// CATEGORY ICON CHIP
// ─────────────────────────────────────────
function CatChip({name,icon,color,selected,pct,onPress}:{name:string;icon:string;color:string;selected?:boolean;pct?:number;onPress?:()=>void}) {
  return (
    <Pressable style={[s.catChip,selected&&{borderColor:color,backgroundColor:color+'22'}]} onPress={onPress}>
      <View style={[s.catChipIco,{backgroundColor:color+'22',borderColor:color+'44'}]}>
        <Feather name={icon as any} size={16} color={color}/>
      </View>
      <Text style={[s.catChipTxt,selected&&{color}]} numberOfLines={1}>{name}</Text>
      {pct!==undefined&&pct>0&&<Text style={[s.catChipPct,{color}]}>{pct}%</Text>}
    </Pressable>
  );
}

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { apiFetch } = useApi();
  const qc = useQueryClient();
  const topPad = Platform.OS==='web'?67:insets.top;
  const botPad = Platform.OS==='web'?34:insets.bottom;

  // ── State ──
  const [period, setPeriod] = useState<Period>('month');
  const [curDate, setCurDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('chart');
  const [selCat, setSelCat] = useState<string|null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity>({type:'personal',id:null,name:'Personal',color:Colors.accent,icon:'user'});

  // modals
  const [showAdd, setShowAdd] = useState(false);
  const [showBizMgr, setShowBizMgr] = useState(false);
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [showCatLib, setShowCatLib] = useState(false);
  const [showCurrPicker, setShowCurrPicker] = useState(false);

  // add transaction form
  const [addType, setAddType] = useState<'income'|'expense'>('expense');
  const [addAmt, setAddAmt] = useState('');
  const [addCat, setAddCat] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0,10));

  // add business form
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState(BUSINESS_TYPES[0].label);
  const [bizColor, setBizColor] = useState(BUSINESS_COLORS[0]);
  const [bizDesc, setBizDesc] = useState('');

  // currency
  const [defSym, setDefSym] = useState('$');
  const [defCode, setDefCode] = useState('USD');

  // ── API Queries ──
  const { data: allExpenses = [], refetch: refetchExp } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => apiFetch('/expenses'),
  });

  const { data: businesses = [], refetch: refetchBiz } = useQuery<Business[]>({
    queryKey: ['businesses'],
    queryFn: () => apiFetch('/businesses'),
  });

  const { data: customCats = [] } = useQuery<CustomCategory[]>({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  const { data: currencies = [] } = useQuery<CurrencyRow[]>({
    queryKey: ['currencies'],
    queryFn: () => apiFetch('/currencies'),
  });

  useEffect(() => {
    const def = currencies.find((c)=>c.isDefault);
    if (def) { setDefSym(def.symbol); setDefCode(def.code); }
    else AsyncStorage.getItem('xenfi_currency').then((v)=>{ if(v){const c=JSON.parse(v);setDefSym(c.symbol);setDefCode(c.code);} });
  }, [currencies]);

  // ── Entities list ──
  const entities: Entity[] = useMemo(()=>[
    {type:'personal',id:null,name:'Personal',color:Colors.accent,icon:'user'},
    ...businesses.map((b)=>({type:'business' as const,id:b.id,name:b.name,color:b.color,icon:b.icon||'briefcase'})),
  ],[businesses]);

  // ── Filter expenses by entity + period ──
  const entityExpenses = useMemo(()=>allExpenses.filter((e)=>{
    if(selectedEntity.type==='personal') return e.entityType==='personal'||e.entityType==null;
    return e.entityType==='business'&&e.entityId===selectedEntity.id;
  }),[allExpenses,selectedEntity]);

  const filtered = useMemo(()=>entityExpenses.filter((e)=>{
    if(period==='all') return true;
    const d=new Date(e.date),n=curDate;
    if(period==='day') return d.toDateString()===n.toDateString();
    if(period==='week'){
      const ws=new Date(n);ws.setDate(n.getDate()-n.getDay());ws.setHours(0,0,0,0);
      const we=new Date(ws);we.setDate(ws.getDate()+6);we.setHours(23,59,59,999);
      return d>=ws&&d<=we;
    }
    if(period==='month') return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
    if(period==='year') return d.getFullYear()===n.getFullYear();
    return true;
  }),[entityExpenses,period,curDate]);

  const totalIncome = useMemo(()=>filtered.filter(e=>e.txType==='income').reduce((s,e)=>s+e.amount,0),[filtered]);
  const totalExp    = useMemo(()=>filtered.filter(e=>e.txType==='expense').reduce((s,e)=>s+e.amount,0),[filtered]);
  const balance     = totalIncome - totalExp;

  const catTotals = useMemo(()=>{
    const map:Record<string,number>={};
    filtered.filter(e=>e.txType==='expense').forEach(e=>{map[e.category]=(map[e.category]||0)+e.amount;});
    return map;
  },[filtered]);

  // ── All categories (preset + custom for this entity) ──
  const allCats = useMemo(()=>{
    const custom = customCats
      .filter(c=>{
        if(selectedEntity.type==='personal') return c.entityType==='personal'||!c.entityType;
        return c.entityId===selectedEntity.id;
      })
      .map(c=>({...c,id:String(c.id)}));
    return [...PRESET_CATEGORIES,...custom];
  },[customCats,selectedEntity]);

  const addModeCats = useMemo(()=>allCats.filter(c=>c.txType===addType),[allCats,addType]);
  const expCats     = useMemo(()=>allCats.filter(c=>c.txType==='expense'),[allCats]);

  const chartData = useMemo(()=>
    Object.entries(catTotals).map(([cat,val])=>{
      const found=allCats.find(c=>c.name.toLowerCase()===cat.toLowerCase());
      return {value:val,color:found?.color||'#888'};
    }),[catTotals,allCats]);

  const catGroups = useMemo(()=>{
    const map:Record<string,Expense[]>={};
    filtered.forEach(e=>{if(!map[e.category])map[e.category]=[];map[e.category].push(e);});
    return Object.entries(map).sort(([,a],[,b])=>b.reduce((s,x)=>s+x.amount,0)-a.reduce((s,x)=>s+x.amount,0));
  },[filtered]);

  // radial chart layout
  const ORBIT = CHART_R + STROKE/2 + 48;
  const CELL = 56;
  const areaH = (ORBIT+CELL/2+12)*2;
  const radialCats = useMemo(()=>{
    const cats=expCats.slice(0,12);
    const n=cats.length;
    const cx=SW/2,cy=areaH/2;
    return cats.map((cat,i)=>{
      const angle=(i/n)*2*Math.PI-Math.PI/2;
      return {cat,x:cx+Math.cos(angle)*ORBIT-CELL/2,y:cy+Math.sin(angle)*ORBIT-CELL/2,
        pct:totalExp>0?Math.round(((catTotals[cat.name]||0)/totalExp)*100):0};
    });
  },[expCats,catTotals,totalExp,areaH,ORBIT]);

  // ── Period helpers ──
  function navPeriod(d:number){
    const dt=new Date(curDate);
    if(period==='day')dt.setDate(dt.getDate()+d);
    else if(period==='week')dt.setDate(dt.getDate()+d*7);
    else if(period==='month')dt.setMonth(dt.getMonth()+d);
    else if(period==='year')dt.setFullYear(dt.getFullYear()+d);
    setCurDate(dt);
  }
  function periodLabel(){
    if(period==='all') return 'All Time';
    const o:Intl.DateTimeFormatOptions=period==='day'?{weekday:'short',day:'numeric',month:'short'}
      :period==='week'?{day:'numeric',month:'short'}
      :period==='month'?{month:'long',year:'numeric'}:{year:'numeric'};
    return curDate.toLocaleDateString('en-US',o);
  }

  // ── Mutations ──
  const addMut = useMutation({
    mutationFn:(d:object)=>apiFetch('/expenses',{method:'POST',body:JSON.stringify(d)}),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:['expenses']});
      qc.invalidateQueries({queryKey:['insights']});
      setShowAdd(false);setAddAmt('');setAddCat('');setAddDesc('');
      setAddDate(new Date().toISOString().slice(0,10));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError:(e:any)=>Alert.alert('Error',e.message),
  });

  const delMut = useMutation({
    mutationFn:(id:number)=>apiFetch(`/expenses/${id}`,{method:'DELETE'}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['expenses']}),
  });

  const addBizMut = useMutation({
    mutationFn:(d:object)=>apiFetch('/businesses',{method:'POST',body:JSON.stringify(d)}),
    onSuccess:(biz:Business)=>{
      qc.invalidateQueries({queryKey:['businesses']});
      setBizName('');setBizType(BUSINESS_TYPES[0].label);setBizColor(BUSINESS_COLORS[0]);setBizDesc('');
      setShowAddBiz(false);
      setSelectedEntity({type:'business',id:biz.id,name:biz.name,color:biz.color,icon:biz.icon||'briefcase'});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError:(e:any)=>Alert.alert('Error',e.message),
  });

  const delBizMut = useMutation({
    mutationFn:(id:number)=>apiFetch(`/businesses/${id}`,{method:'DELETE'}),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:['businesses']});
      setSelectedEntity(entities[0]);
    },
  });

  const addCatMut = useMutation({
    mutationFn:(d:object)=>apiFetch('/categories',{method:'POST',body:JSON.stringify(d)}),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['categories']}); setShowCatLib(false); },
  });

  function handleAdd(){
    if(!addAmt||!addCat) return Alert.alert('Required','Enter amount and select category');
    const payload:any={
      amount:parseFloat(addAmt),category:addCat,
      description:addDesc||addCat,date:new Date(addDate).toISOString(),
      txType:addType,currency:defCode,
    };
    if(selectedEntity.type==='business'){
      payload.entityType='business';payload.entityId=selectedEntity.id;
    } else {
      payload.entityType='personal';payload.entityId=null;
    }
    addMut.mutate(payload);
  }

  function handleAddBiz(){
    if(!bizName.trim()) return Alert.alert('Required','Enter business name');
    const bt=BUSINESS_TYPES.find(t=>t.label===bizType);
    addBizMut.mutate({name:bizName.trim(),type:bizType,color:bizColor,icon:bt?.icon||'briefcase',description:bizDesc});
  }

  function addFromLibrary(item:{name:string;icon:string;color:string;txType:string}){
    const payload:any={name:item.name,icon:item.icon,color:item.color,txType:item.txType};
    if(selectedEntity.type==='business'){payload.entityType='business';payload.entityId=selectedEntity.id;}
    else{payload.entityType='personal';}
    addCatMut.mutate(payload);
  }

  // library items that aren't already added
  const addedNames = useMemo(()=>new Set([...PRESET_CATEGORIES.map(c=>c.name),...customCats.map(c=>c.name)]),[customCats]);

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <View style={[s.root,{paddingTop:topPad}]}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Expenses</Text>
          <Text style={s.headerSub}>{selectedEntity.name}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable style={s.hBtn} onPress={()=>setView(view==='chart'?'list':'chart')} hitSlop={8}>
            <Feather name={view==='chart'?'list':'pie-chart'} size={18} color={Colors.accent}/>
          </Pressable>
          <Pressable style={[s.hBtn,{backgroundColor:Colors.accent+'22',borderColor:Colors.accent+'44'}]}
            onPress={()=>setShowBizMgr(true)} hitSlop={8}>
            <Feather name="briefcase" size={16} color={Colors.accent}/>
          </Pressable>
        </View>
      </View>

      {/* ── ENTITY TABS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.entityScroll} contentContainerStyle={s.entityRow}>
        {entities.map((e)=>(
          <EntityTab key={e.type+String(e.id)} entity={e} active={selectedEntity.type===e.type&&selectedEntity.id===e.id}
            onPress={()=>setSelectedEntity(e)}/>
        ))}
        <Pressable style={s.addEntityBtn} onPress={()=>setShowAddBiz(true)}>
          <Feather name="plus" size={13} color={Colors.accent}/>
          <Text style={s.addEntityTxt}>Add Business</Text>
        </Pressable>
      </ScrollView>

      {/* ── PERIOD TABS ── */}
      <View style={s.periodWrap}>
        <View style={s.periodTabs}>
          {(['day','week','month','year','all'] as Period[]).map((p)=>(
            <Pressable key={p} style={[s.periodTab,period===p&&s.periodTabActive]} onPress={()=>setPeriod(p)}>
              <Text style={[s.periodTabTxt,period===p&&s.periodTabTxtActive]}>{p==='all'?'All':p.charAt(0).toUpperCase()+p.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        {period!=='all'&&(
          <View style={s.periodNav}>
            <Pressable onPress={()=>navPeriod(-1)} hitSlop={10}><Feather name="chevron-left" size={16} color={Colors.textSecondary}/></Pressable>
            <Text style={s.periodLbl}>{periodLabel()}</Text>
            <Pressable onPress={()=>navPeriod(1)} hitSlop={10}><Feather name="chevron-right" size={16} color={Colors.textSecondary}/></Pressable>
          </View>
        )}
      </View>

      {/* ── STATS ROW ── */}
      <View style={s.statsRow}>
        <StatCard label="Income" amount={totalIncome} symbol={defSym} color={Colors.highlight} icon="trending-up"/>
        <StatCard label="Expense" amount={totalExp} symbol={defSym} color={Colors.error} icon="trending-down"/>
        <StatCard label={balance>=0?'Saved':'Deficit'} amount={balance} symbol={defSym}
          color={balance>=0?Colors.highlight:Colors.error} icon={balance>=0?'check-circle':'alert-circle'}/>
      </View>

      {/* ── CHART VIEW ── */}
      {view==='chart'?(
        <View style={[s.chartArea,{height:areaH}]}>
          {radialCats.map(({cat,x,y,pct})=>(
            <View key={cat.id} style={{position:'absolute',left:x,top:y,width:CELL,alignItems:'center'}}>
              <CatChip name={cat.name} icon={cat.icon} color={cat.color} pct={pct}
                selected={selCat===cat.name} onPress={()=>setSelCat(selCat===cat.name?null:cat.name)}/>
            </View>
          ))}
          <View style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center'}]}>
            <DonutChart income={totalIncome} expense={totalExp} data={chartData} symbol={defSym}/>
          </View>
          {selCat&&catTotals[selCat]&&(
            <View style={s.catPopup}>
              <Text style={s.catPopupName}>{selCat}</Text>
              <Text style={s.catPopupAmt}>{defSym}{catTotals[selCat].toLocaleString('en-US',{minimumFractionDigits:2})}</Text>
              <Text style={s.catPopupCt}>{filtered.filter(e=>e.category===selCat).length} transactions</Text>
            </View>
          )}
        </View>
      ):(
        /* ── LIST VIEW ── */
        <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:160+botPad}}
          showsVerticalScrollIndicator={false}>
          {catGroups.length===0?(
            <View style={s.empty}>
              <View style={s.emptyIco}><Feather name="inbox" size={32} color={Colors.textMuted}/></View>
              <Text style={s.emptyTxt}>No transactions</Text>
              <Text style={s.emptySub}>Add your first {selectedEntity.type==='business'?`${selectedEntity.name} `:''}transaction</Text>
            </View>
          ):catGroups.map(([cat,txs])=>{
            const tot=txs.reduce((s,e)=>s+e.amount,0);
            const ci=allCats.find(c=>c.name.toLowerCase()===cat.toLowerCase());
            const exp=selCat===cat;
            const isInc=txs[0]?.txType==='income';
            const pct=isInc?0:totalExp>0?Math.round((tot/totalExp)*100):0;
            return (
              <View key={cat} style={s.grp}>
                <Pressable style={s.grpHd} onPress={()=>setSelCat(exp?null:cat)}>
                  <View style={[s.grpIco,{backgroundColor:(ci?.color||Colors.accent)+'22',borderColor:ci?.color||Colors.accent}]}>
                    <Feather name={(ci?.icon||'tag') as any} size={15} color={ci?.color||Colors.accent}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.grpName}>{cat}</Text>
                    {!isInc&&pct>0&&(
                      <View style={s.progressBar}>
                        <View style={[s.progressFill,{width:`${Math.min(pct,100)}%` as any,backgroundColor:ci?.color||Colors.accent}]}/>
                      </View>
                    )}
                  </View>
                  <Text style={s.grpCt}>{txs.length} items</Text>
                  <Text style={[s.grpAmt,{color:isInc?Colors.highlight:Colors.error}]}>
                    {isInc?'+':'-'}{defSym}{tot.toLocaleString('en-US',{minimumFractionDigits:2})}
                  </Text>
                  <Feather name={exp?'chevron-up':'chevron-down'} size={14} color={Colors.textMuted} style={{marginLeft:6}}/>
                </Pressable>
                {exp&&txs.map((e)=>(
                  <View key={e.id} style={s.txRow}>
                    <View style={[s.txDot,{backgroundColor:(ci?.color||Colors.accent)+'44'}]}>
                      <Feather name={(ci?.icon||'circle') as any} size={12} color={ci?.color||Colors.accent}/>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={s.txDesc}>{e.description||e.category}</Text>
                      <Text style={s.txDate}>{new Date(e.date).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</Text>
                    </View>
                    <Text style={[s.txAmt,{color:e.txType==='income'?Colors.highlight:Colors.error}]}>
                      {e.txType==='income'?'+':'-'}{defSym}{e.amount.toLocaleString('en-US',{minimumFractionDigits:2})}
                    </Text>
                    <Pressable onPress={()=>delMut.mutate(e.id)} hitSlop={12} style={s.delBtn}>
                      <Feather name="trash-2" size={13} color={Colors.textMuted}/>
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── BOTTOM FABs ── */}
      <View style={[s.fabWrap,{paddingBottom:Math.max(botPad,8)+80}]}>
        <View style={[s.balBar,{borderColor:balance>=0?Colors.highlight+'44':Colors.error+'44',
          backgroundColor:balance>=0?Colors.highlight+'0F':Colors.error+'0F'}]}>
          <Feather name={balance>=0?'arrow-up-right':'arrow-down-right'} size={14}
            color={balance>=0?Colors.highlight:Colors.error}/>
          <Text style={[s.balTxt,{color:balance>=0?Colors.highlight:Colors.error}]}>
            {balance>=0?'Saved':'Deficit'}  {defSym}{Math.abs(balance).toLocaleString('en-US',{minimumFractionDigits:2})}
          </Text>
        </View>
        <View style={s.fabRow}>
          <Pressable style={[s.fab,s.fabMinus]} onPress={()=>{setAddType('expense');setAddCat('');setShowAdd(true);}}
            hitSlop={4}>
            <Feather name="minus" size={24} color={Colors.error}/>
            <Text style={[s.fabTxt,{color:Colors.error}]}>Expense</Text>
          </Pressable>
          <Pressable style={[s.fab,s.fabPlus]} onPress={()=>{setAddType('income');setAddCat('');setShowAdd(true);}}
            hitSlop={4}>
            <Feather name="plus" size={24} color={Colors.highlight}/>
            <Text style={[s.fabTxt,{color:Colors.highlight}]}>Income</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════════════════════════════
          ADD TRANSACTION MODAL
      ══════════════════════════════════════ */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS==='ios'?'padding':'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setShowAdd(false)}/>
          <View style={s.sheet}>
            <View style={s.sheetHandle}/>
            <Text style={s.sheetTitle}>
              {selectedEntity.type==='business'?`${selectedEntity.name} — `:'Personal — '}
              {addType==='expense'?'Expense':'Income'}
            </Text>

            {/* Type toggle */}
            <View style={s.typeRow}>
              <Pressable style={[s.typeBtn,addType==='expense'&&{backgroundColor:Colors.error,borderColor:Colors.error}]}
                onPress={()=>{setAddType('expense');setAddCat('');}}>
                <Feather name="minus" size={14} color={addType==='expense'?'#fff':Colors.error}/>
                <Text style={[s.typeTxt,{color:addType==='expense'?'#fff':Colors.textSecondary}]}>Expense</Text>
              </Pressable>
              <Pressable style={[s.typeBtn,addType==='income'&&{backgroundColor:Colors.highlight,borderColor:Colors.highlight}]}
                onPress={()=>{setAddType('income');setAddCat('');}}>
                <Feather name="plus" size={14} color={addType==='income'?'#fff':Colors.highlight}/>
                <Text style={[s.typeTxt,{color:addType==='income'?'#fff':Colors.textSecondary}]}>Income</Text>
              </Pressable>
            </View>

            {/* Amount */}
            <View style={s.amtRow}>
              <Text style={s.amtSym}>{defSym}</Text>
              <TextInput style={s.amtInput} value={addAmt} onChangeText={setAddAmt}
                keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.textMuted} autoFocus/>
            </View>

            {/* Category scroll */}
            <Text style={s.fieldLbl}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:4}}
              contentContainerStyle={{gap:8,paddingHorizontal:16}}>
              {addModeCats.map((cat)=>(
                <Pressable key={String(cat.id)} onPress={()=>setAddCat(cat.name)}
                  style={[s.catPill,addCat===cat.name&&{borderColor:cat.color,backgroundColor:cat.color+'22'}]}>
                  <Feather name={(cat.icon||'tag') as any} size={14} color={cat.color}/>
                  <Text style={[s.catPillTxt,{color:addCat===cat.name?cat.color:Colors.textSecondary}]}>{cat.name}</Text>
                </Pressable>
              ))}
              <Pressable style={s.catPillAdd} onPress={()=>setShowCatLib(true)}>
                <Feather name="plus" size={13} color={Colors.accent}/>
                <Text style={s.catPillAddTxt}>More</Text>
              </Pressable>
            </ScrollView>

            {/* Description + Date */}
            <View style={s.fieldRow}>
              <View style={[s.fieldBox,{flex:2}]}>
                <Text style={s.fieldLbl}>Description</Text>
                <TextInput style={s.fieldInput} value={addDesc} onChangeText={setAddDesc}
                  placeholder="Optional" placeholderTextColor={Colors.textMuted}/>
              </View>
              <View style={[s.fieldBox,{flex:1}]}>
                <Text style={s.fieldLbl}>Date</Text>
                <TextInput style={s.fieldInput} value={addDate} onChangeText={setAddDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted}/>
              </View>
            </View>

            <Pressable style={[s.submitBtn,{backgroundColor:addType==='expense'?Colors.error:Colors.highlight}]}
              onPress={handleAdd} disabled={addMut.isPending}>
              {addMut.isPending?<ActivityIndicator color="#fff" size="small"/>
                :<Text style={s.submitTxt}>Save {addType==='expense'?'Expense':'Income'}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════
          BUSINESS MANAGER MODAL
      ══════════════════════════════════════ */}
      <Modal visible={showBizMgr} animationType="slide" transparent>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setShowBizMgr(false)}/>
          <View style={s.sheet}>
            <View style={s.sheetHandle}/>
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>My Businesses</Text>
              <Pressable style={s.sheetAddBtn} onPress={()=>{setShowBizMgr(false);setShowAddBiz(true);}}>
                <Feather name="plus" size={14} color={Colors.accent}/>
                <Text style={s.sheetAddTxt}>New</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight:400}}>
              {businesses.length===0?(
                <View style={s.empty}>
                  <View style={s.emptyIco}><Feather name="briefcase" size={28} color={Colors.textMuted}/></View>
                  <Text style={s.emptyTxt}>No businesses yet</Text>
                  <Text style={s.emptySub}>Add a business to track its finances separately</Text>
                </View>
              ):businesses.map((biz)=>(
                <View key={biz.id} style={[s.bizCard,{borderColor:biz.color+'44'}]}>
                  <View style={[s.bizIco,{backgroundColor:biz.color+'22',borderColor:biz.color+'44'}]}>
                    <Feather name={(biz.icon||'briefcase') as any} size={20} color={biz.color}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.bizName}>{biz.name}</Text>
                    <Text style={s.bizType}>{biz.type}</Text>
                  </View>
                  <Pressable onPress={()=>{setSelectedEntity({type:'business',id:biz.id,name:biz.name,color:biz.color,icon:biz.icon||'briefcase'});setShowBizMgr(false);}}
                    style={[s.bizSelectBtn,{borderColor:biz.color+'66'}]}>
                    <Text style={[s.bizSelectTxt,{color:biz.color}]}>View</Text>
                  </Pressable>
                  <Pressable onPress={()=>Alert.alert('Delete Business',`Remove "${biz.name}"? This won't delete transactions.`,[
                    {text:'Cancel',style:'cancel'},
                    {text:'Delete',style:'destructive',onPress:()=>delBizMut.mutate(biz.id)},
                  ])} style={{padding:8}}>
                    <Feather name="trash-2" size={15} color={Colors.textMuted}/>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          ADD BUSINESS MODAL
      ══════════════════════════════════════ */}
      <Modal visible={showAddBiz} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS==='ios'?'padding':'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setShowAddBiz(false)}/>
          <View style={s.sheet}>
            <View style={s.sheetHandle}/>
            <Text style={s.sheetTitle}>Add Business</Text>

            <Text style={s.fieldLbl}>Business Name</Text>
            <TextInput style={s.fieldInput2} value={bizName} onChangeText={setBizName}
              placeholder="e.g. My Shop, Studio, Consulting" placeholderTextColor={Colors.textMuted} autoFocus/>

            <Text style={s.fieldLbl}>Business Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}
              contentContainerStyle={{gap:8,paddingHorizontal:2}}>
              {BUSINESS_TYPES.map((t)=>(
                <Pressable key={t.label} onPress={()=>setBizType(t.label)}
                  style={[s.typeChip,bizType===t.label&&{backgroundColor:t.color,borderColor:t.color}]}>
                  <Feather name={t.icon as any} size={13} color={bizType===t.label?Colors.primary:t.color}/>
                  <Text style={[s.typeChipTxt,{color:bizType===t.label?Colors.primary:Colors.textSecondary}]}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.fieldLbl}>Color</Text>
            <View style={s.colorRow}>
              {BUSINESS_COLORS.map((c)=>(
                <Pressable key={c} onPress={()=>setBizColor(c)}
                  style={[s.colorDot,{backgroundColor:c},bizColor===c&&s.colorDotActive]}/>
              ))}
            </View>

            <Text style={s.fieldLbl}>Description (optional)</Text>
            <TextInput style={s.fieldInput2} value={bizDesc} onChangeText={setBizDesc}
              placeholder="What does this business do?" placeholderTextColor={Colors.textMuted}/>

            <Pressable style={[s.submitBtn,{backgroundColor:bizColor}]} onPress={handleAddBiz} disabled={addBizMut.isPending}>
              {addBizMut.isPending?<ActivityIndicator color="#fff" size="small"/>
                :<Text style={s.submitTxt}>Create Business</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════
          CATEGORY LIBRARY MODAL
      ══════════════════════════════════════ */}
      <Modal visible={showCatLib} animationType="slide" transparent>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setShowCatLib(false)}/>
          <View style={[s.sheet,{maxHeight:'85%'}]}>
            <View style={s.sheetHandle}/>
            <Text style={s.sheetTitle}>Category Library</Text>
            <Text style={s.sheetSub}>Tap to add to {selectedEntity.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{flex:1}}>
              {CATEGORY_LIBRARY.map((section)=>(
                <View key={section.section} style={{marginBottom:16}}>
                  <Text style={s.libSection}>{section.section}</Text>
                  <View style={s.libGrid}>
                    {section.items.map((item)=>{
                      const added=addedNames.has(item.name);
                      return (
                        <Pressable key={item.name} onPress={()=>!added&&addFromLibrary(item)}
                          style={[s.libItem,added&&s.libItemAdded]}>
                          <View style={[s.libIco,{backgroundColor:item.color+'22',borderColor:item.color+(added?'44':'88')}]}>
                            <Feather name={item.icon as any} size={18} color={item.color+(added?'66':'')}/>
                          </View>
                          <Text style={[s.libName,added&&{color:Colors.textMuted}]}>{item.name}</Text>
                          {added&&<Feather name="check" size={10} color={Colors.highlight} style={{marginTop:1}}/>}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={{height:32}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.background},
  // Header
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,paddingBottom:8},
  headerLeft:{},
  headerTitle:{fontFamily:'Inter_700Bold',fontSize:22,color:Colors.text},
  headerSub:{fontFamily:'Inter_400Regular',fontSize:13,color:Colors.textSecondary,marginTop:1},
  headerRight:{flexDirection:'row',gap:8,alignItems:'center'},
  hBtn:{width:36,height:36,borderRadius:10,backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.cardBorder,alignItems:'center',justifyContent:'center'},
  // Entity tabs
  entityScroll:{flexGrow:0},
  entityRow:{paddingHorizontal:16,paddingBottom:8,gap:8,flexDirection:'row',alignItems:'center'},
  entityTab:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:6,borderRadius:20,borderWidth:1.5,borderColor:Colors.cardBorder,backgroundColor:Colors.card},
  entityDot:{width:20,height:20,borderRadius:10,alignItems:'center',justifyContent:'center'},
  entityName:{fontFamily:'Inter_600SemiBold',fontSize:12,color:Colors.text,maxWidth:90},
  addEntityBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:6,borderRadius:20,borderWidth:1.5,borderColor:Colors.accent+'44',borderStyle:'dashed'},
  addEntityTxt:{fontFamily:'Inter_500Medium',fontSize:12,color:Colors.accent},
  // Period
  periodWrap:{paddingHorizontal:16,gap:6,marginBottom:4},
  periodTabs:{flexDirection:'row',backgroundColor:Colors.card,borderRadius:12,padding:3,gap:2},
  periodTab:{flex:1,paddingVertical:6,borderRadius:9,alignItems:'center'},
  periodTabActive:{backgroundColor:Colors.backgroundTertiary},
  periodTabTxt:{fontFamily:'Inter_500Medium',fontSize:12,color:Colors.textMuted},
  periodTabTxtActive:{color:Colors.text},
  periodNav:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},
  periodLbl:{fontFamily:'Inter_600SemiBold',fontSize:14,color:Colors.text},
  // Stats
  statsRow:{flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:4},
  statCard:{flex:1,backgroundColor:Colors.card,borderRadius:14,borderWidth:1,padding:12,alignItems:'center',gap:4},
  statIcon:{width:28,height:28,borderRadius:8,alignItems:'center',justifyContent:'center',marginBottom:2},
  statLbl:{fontFamily:'Inter_400Regular',fontSize:11,color:Colors.textMuted},
  statAmt:{fontFamily:'Inter_700Bold',fontSize:14,color:Colors.text},
  // Chart
  chartArea:{position:'relative',alignItems:'center',justifyContent:'center'},
  chartInc:{fontFamily:'Inter_700Bold',fontSize:13,color:Colors.highlight,textAlign:'center'},
  chartExp:{fontFamily:'Inter_500Medium',fontSize:11,color:Colors.error,textAlign:'center'},
  // Cat chip (radial)
  catChip:{alignItems:'center',gap:2,minWidth:52},
  catChipIco:{width:36,height:36,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  catChipTxt:{fontFamily:'Inter_400Regular',fontSize:9,color:Colors.textSecondary,textAlign:'center'},
  catChipPct:{fontFamily:'Inter_700Bold',fontSize:9,textAlign:'center'},
  // Cat popup
  catPopup:{position:'absolute',bottom:8,alignSelf:'center',backgroundColor:Colors.card,borderRadius:14,borderWidth:1,borderColor:Colors.cardBorder,paddingVertical:10,paddingHorizontal:20,alignItems:'center',gap:2},
  catPopupName:{fontFamily:'Inter_700Bold',fontSize:14,color:Colors.text},
  catPopupAmt:{fontFamily:'Inter_600SemiBold',fontSize:16,color:Colors.accent},
  catPopupCt:{fontFamily:'Inter_400Regular',fontSize:11,color:Colors.textMuted},
  // List
  grp:{backgroundColor:Colors.card,borderRadius:16,borderWidth:1,borderColor:Colors.cardBorder,marginBottom:10,overflow:'hidden'},
  grpHd:{flexDirection:'row',alignItems:'center',gap:10,padding:14},
  grpIco:{width:36,height:36,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  grpName:{fontFamily:'Inter_600SemiBold',fontSize:14,color:Colors.text,flex:1},
  grpCt:{fontFamily:'Inter_400Regular',fontSize:11,color:Colors.textMuted},
  grpAmt:{fontFamily:'Inter_700Bold',fontSize:15,marginLeft:6},
  progressBar:{height:3,backgroundColor:Colors.backgroundTertiary,borderRadius:2,marginTop:4,overflow:'hidden'},
  progressFill:{height:'100%',borderRadius:2},
  txRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:10,borderTopWidth:1,borderTopColor:Colors.cardBorder},
  txDot:{width:28,height:28,borderRadius:8,alignItems:'center',justifyContent:'center'},
  txDesc:{fontFamily:'Inter_500Medium',fontSize:13,color:Colors.text},
  txDate:{fontFamily:'Inter_400Regular',fontSize:11,color:Colors.textMuted},
  txAmt:{fontFamily:'Inter_600SemiBold',fontSize:13},
  delBtn:{padding:6,borderRadius:6},
  // Empty
  empty:{alignItems:'center',gap:8,padding:40},
  emptyIco:{width:64,height:64,borderRadius:20,backgroundColor:Colors.card,alignItems:'center',justifyContent:'center',marginBottom:4},
  emptyTxt:{fontFamily:'Inter_600SemiBold',fontSize:16,color:Colors.text},
  emptySub:{fontFamily:'Inter_400Regular',fontSize:13,color:Colors.textMuted,textAlign:'center'},
  // FABs
  fabWrap:{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:16,gap:8},
  balBar:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderRadius:12,paddingVertical:8,paddingHorizontal:14},
  balTxt:{fontFamily:'Inter_600SemiBold',fontSize:14,flex:1},
  fabRow:{flexDirection:'row',gap:10},
  fab:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:16,paddingVertical:14,borderWidth:1.5},
  fabMinus:{backgroundColor:Colors.error+'18',borderColor:Colors.error+'44'},
  fabPlus:{backgroundColor:Colors.highlight+'18',borderColor:Colors.highlight+'44'},
  fabTxt:{fontFamily:'Inter_700Bold',fontSize:14},
  // Modal
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.6)'},
  sheet:{backgroundColor:Colors.backgroundSecondary,borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:16,paddingBottom:Platform.OS==='ios'?36:24,paddingTop:4,gap:12,maxHeight:'92%'},
  sheetHandle:{width:40,height:4,borderRadius:2,backgroundColor:Colors.cardBorder,alignSelf:'center',marginBottom:8},
  sheetTitle:{fontFamily:'Inter_700Bold',fontSize:18,color:Colors.text},
  sheetSub:{fontFamily:'Inter_400Regular',fontSize:13,color:Colors.textSecondary,marginTop:-8},
  sheetHeaderRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  sheetAddBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:Colors.accent+'22',borderRadius:10,paddingHorizontal:10,paddingVertical:6,borderWidth:1,borderColor:Colors.accent+'44'},
  sheetAddTxt:{fontFamily:'Inter_600SemiBold',fontSize:13,color:Colors.accent},
  // Transaction form
  typeRow:{flexDirection:'row',gap:8},
  typeBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:10,borderRadius:12,borderWidth:1.5,borderColor:Colors.cardBorder},
  typeTxt:{fontFamily:'Inter_600SemiBold',fontSize:14},
  amtRow:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.backgroundTertiary,borderRadius:16,paddingHorizontal:16,height:64,borderWidth:1,borderColor:Colors.cardBorder},
  amtSym:{fontFamily:'Inter_700Bold',fontSize:24,color:Colors.textSecondary,marginRight:4},
  amtInput:{flex:1,fontFamily:'Inter_700Bold',fontSize:28,color:Colors.text},
  fieldLbl:{fontFamily:'Inter_500Medium',fontSize:12,color:Colors.textSecondary,marginBottom:-4},
  catPill:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:6,borderRadius:10,borderWidth:1,borderColor:Colors.cardBorder,backgroundColor:Colors.card},
  catPillTxt:{fontFamily:'Inter_500Medium',fontSize:12},
  catPillAdd:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:6,borderRadius:10,borderWidth:1,borderColor:Colors.accent+'44',borderStyle:'dashed'},
  catPillAddTxt:{fontFamily:'Inter_500Medium',fontSize:12,color:Colors.accent},
  fieldRow:{flexDirection:'row',gap:8},
  fieldBox:{gap:4},
  fieldInput:{backgroundColor:Colors.backgroundTertiary,borderRadius:12,borderWidth:1,borderColor:Colors.cardBorder,paddingHorizontal:12,paddingVertical:10,fontFamily:'Inter_400Regular',fontSize:14,color:Colors.text},
  fieldInput2:{backgroundColor:Colors.backgroundTertiary,borderRadius:12,borderWidth:1,borderColor:Colors.cardBorder,paddingHorizontal:14,paddingVertical:12,fontFamily:'Inter_400Regular',fontSize:15,color:Colors.text,marginBottom:4},
  submitBtn:{borderRadius:14,paddingVertical:16,alignItems:'center',justifyContent:'center',marginTop:4},
  submitTxt:{fontFamily:'Inter_700Bold',fontSize:16,color:'#fff'},
  // Business card
  bizCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:Colors.card,borderRadius:16,borderWidth:1,padding:14,marginBottom:10},
  bizIco:{width:44,height:44,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
  bizName:{fontFamily:'Inter_600SemiBold',fontSize:15,color:Colors.text},
  bizType:{fontFamily:'Inter_400Regular',fontSize:12,color:Colors.textMuted},
  bizSelectBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:10,borderWidth:1},
  bizSelectTxt:{fontFamily:'Inter_600SemiBold',fontSize:12},
  // Add business
  typeChip:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:10,borderWidth:1.5,borderColor:Colors.cardBorder,backgroundColor:Colors.card},
  typeChipTxt:{fontFamily:'Inter_500Medium',fontSize:12},
  colorRow:{flexDirection:'row',gap:10,flexWrap:'wrap',marginBottom:4},
  colorDot:{width:28,height:28,borderRadius:14},
  colorDotActive:{borderWidth:3,borderColor:'#fff'},
  // Library
  libSection:{fontFamily:'Inter_600SemiBold',fontSize:13,color:Colors.textSecondary,marginBottom:8,letterSpacing:0.5,textTransform:'uppercase'},
  libGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  libItem:{alignItems:'center',gap:4,width:(SW-48)/5,paddingVertical:6},
  libItemAdded:{opacity:0.5},
  libIco:{width:42,height:42,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
  libName:{fontFamily:'Inter_400Regular',fontSize:11,color:Colors.text,textAlign:'center'},
});
