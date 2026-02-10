// import { Badge } from "@dashboard/ui/components/badge";
// import { Button } from "@dashboard/ui/components/button";
// import { Checkbox } from "@dashboard/ui/components/checkbox";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@dashboard/ui/components/dropdown-menu";
// import { Input } from "@dashboard/ui/components/input";
// import {
//   Calendar,
//   ChevronDown,
//   CircleDashed,
//   Columns3,
//   Filter,
//   Hash,
//   LayoutGrid,
//   Mail,
//   Phone as PhoneIcon,
//   Plus,
//   Search,
//   Tag as TagIcon,
//   User as UserIcon,
//   X,
// } from "lucide-react";
// import * as React from "react";
// import { useEffect, useMemo, useState } from "react";

// /**********************
//  * DynamicCell section *
//  **********************/
// export type ColumnKind =
//   | "text"
//   | "person"
//   | "email"
//   | "phone"
//   | "number"
//   | "status"
//   | "priority"
//   | "date"
//   | "location"
//   | "tags"
//   | "progress";

// export type SelectOption = { label: string; value: string; color?: string };

// export type ColumnDef = {
//   id: string;
//   label: string;
//   type: ColumnKind;
//   width?: number;
//   required?: boolean;
//   options?: SelectOption[];
// };

// export type CellProps<TValue> = {
//   column: ColumnDef;
//   value: TValue;
//   onChange: (value: TValue) => void;
//   onCommit?: () => void; // blur/Enter
//   autoFocus?: boolean;
// };

// const stop = (e: React.SyntheticEvent) => {
//   e.preventDefault();
//   e.stopPropagation();
// };

// function useCommit(onCommit?: () => void) {
//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" || e.key === "Tab") {
//       onCommit?.();
//       stop(e);
//     }
//   };
//   const handleBlur = () => onCommit?.();
//   return { handleKeyDown, handleBlur };
// }

// export function TextEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<string>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   return (
//     <Input
//       value={value ?? ""}
//       onChange={(e) => onChange(e.target.value)}
//       onKeyDown={handleKeyDown}
//       onBlur={handleBlur}
//       autoFocus={autoFocus}
//       className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm"
//       placeholder="Enter text..."
//     />
//   );
// }

// export function PersonEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<string>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   return (
//     <div className="flex items-center gap-2">
//       <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
//         <UserIcon className="w-3 h-3 text-gray-600" />
//       </div>
//       <Input
//         value={value ?? ""}
//         onChange={(e) => onChange(e.target.value)}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         autoFocus={autoFocus}
//         className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm"
//         placeholder="Enter name..."
//       />
//     </div>
//   );
// }

// export function EmailEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<string>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   return (
//     <div className="flex items-center gap-2">
//       <Mail className="w-3 h-3 text-gray-400" />
//       <Input
//         type="email"
//         value={value ?? ""}
//         onChange={(e) => onChange(e.target.value)}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         autoFocus={autoFocus}
//         className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm text-blue-600"
//         placeholder="name@domain.com"
//       />
//     </div>
//   );
// }

// export function PhoneEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<string>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   return (
//     <div className="flex items-center gap-2">
//       <PhoneIcon className="w-3 h-3 text-gray-400" />
//       <Input
//         type="tel"
//         value={value ?? ""}
//         onChange={(e) => onChange(e.target.value)}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         autoFocus={autoFocus}
//         className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm"
//         placeholder="+1 555 123 4567"
//       />
//     </div>
//   );
// }

// export function NumberEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<number>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   const [draft, setDraft] = useState<string>(String(value ?? 0));
//   useEffect(() => setDraft(String(value ?? 0)), [value]);
//   return (
//     <div className="flex items-center gap-2">
//       <Hash className="w-3 h-3 text-gray-400" />
//       <Input
//         inputMode="decimal"
//         value={draft}
//         onChange={(e) => {
//           const s = e.target.value;
//           setDraft(s);
//           const num = Number(s.replace(/[^0-9.-]/g, ""));
//           if (!Number.isNaN(num)) onChange(num);
//         }}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         autoFocus={autoFocus}
//         className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm"
//         placeholder="0"
//       />
//     </div>
//   );
// }

// export function DateEditor({
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<string>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   return (
//     <div className="flex items-center gap-2">
//       <Calendar className="w-3 h-3 text-gray-400" />
//       <Input
//         type="date"
//         value={value ?? ""}
//         onChange={(e) => onChange(e.target.value)}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         autoFocus={autoFocus}
//         className="h-8 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-sm"
//       />
//     </div>
//   );
// }

// export function ProgressEditor({
//   value,
//   onChange,
//   onCommit,
// }: CellProps<number>) {
//   const { handleKeyDown, handleBlur } = useCommit(onCommit);
//   const v = Math.max(0, Math.min(100, value ?? 0));
//   return (
//     <div className="flex items-center gap-2">
//       <div className="flex-1 h-2 bg-gray-200 rounded-full">
//         <div
//           className="h-2 bg-blue-500 rounded-full transition-all"
//           style={{ width: `${v}%` }}
//         />
//       </div>
//       <Input
//         type="number"
//         value={v}
//         min={0}
//         max={100}
//         onChange={(e) => onChange(Number(e.target.value))}
//         onKeyDown={handleKeyDown}
//         onBlur={handleBlur}
//         className="w-12 h-6 text-xs border border-gray-300 rounded px-1"
//       />
//       <span className="text-xs text-gray-500">%</span>
//     </div>
//   );
// }

// export function SelectEditor({
//   value,
//   onChange,
//   onCommit,
//   column,
// }: CellProps<string>) {
//   const opts = column.options ?? [];
//   const current = opts.find((o) => o.value === value);
//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button
//           variant="ghost"
//           className={`h-8 px-2 text-white text-xs font-medium justify-start ${current?.color ?? "bg-gray-400"}`}
//         >
//           {current?.label ?? "Select..."}
//           <ChevronDown className="w-3 h-3 ml-1" />
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
//         <DropdownMenuLabel>Choose</DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         {opts.map((o) => (
//           <DropdownMenuItem
//             key={o.value}
//             onClick={() => {
//               onChange(o.value);
//               onCommit?.();
//             }}
//           >
//             <span
//               className={`w-3 h-3 rounded mr-2 ${o.color ?? "bg-gray-400"}`}
//             />
//             {o.label}
//           </DropdownMenuItem>
//         ))}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

// export function TagsEditor({ value, onChange, onCommit }: CellProps<string[]>) {
//   const [draft, setDraft] = useState("");
//   const addTag = (tag: string) => {
//     const t = tag.trim();
//     if (!t) return;
//     const next = Array.from(new Set([...(value ?? []), t]));
//     onChange(next);
//     setDraft("");
//   };
//   const remove = (t: string) => onChange((value ?? []).filter((x) => x !== t));
//   const { handleBlur } = useCommit(onCommit);

//   return (
//     <div className="flex items-center gap-2 flex-wrap">
//       {(value ?? []).map((t) => (
//         <Badge key={t} variant="secondary" className="gap-1">
//           <TagIcon className="w-3 h-3" /> {t}
//           <button
//             className="ml-1 text-xs opacity-70 hover:opacity-100"
//             onClick={() => remove(t)}
//             aria-label={`Remove ${t}`}
//           >
//             ×
//           </button>
//         </Badge>
//       ))}
//       <Input
//         value={draft}
//         onChange={(e) => setDraft(e.target.value)}
//         onKeyDown={(e) => {
//           if (e.key === "Enter") {
//             addTag(draft);
//             e.preventDefault();
//           }
//         }}
//         onBlur={handleBlur}
//         className="h-6 w-28 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 text-xs"
//         placeholder="Add tag"
//       />
//     </div>
//   );
// }

// const registry: Record<ColumnKind, React.FC<any>> = {
//   text: TextEditor,
//   person: PersonEditor,
//   email: EmailEditor,
//   phone: PhoneEditor,
//   number: NumberEditor,
//   date: DateEditor,
//   progress: ProgressEditor,
//   status: SelectEditor,
//   priority: SelectEditor,
//   location: TextEditor,
//   tags: TagsEditor,
// };

// export function DynamicCell<T = any>({
//   column,
//   value,
//   onChange,
//   onCommit,
//   autoFocus,
// }: CellProps<T>) {
//   const Comp = registry[column.type] ?? TextEditor;
//   return (
//     <Comp
//       column={column}
//       value={value}
//       onChange={onChange}
//       onCommit={onCommit}
//       autoFocus={autoFocus}
//     />
//   );
// }

// /************************
//  * CRM Dashboard section *
//  ************************/

// type Row = Record<string, any> & { id: string };

// type Group = {
//   id: string;
//   name: string;
//   color: string; // tailwind class like 'border-l-green-500'
//   collapsed: boolean;
//   rows: Row[];
// };

// const initialColumns: ColumnDef[] = [
//   {
//     id: "contact",
//     label: "Contact",
//     type: "person",
//     width: 200,
//     required: true,
//   },
//   { id: "email", label: "Email", type: "email", width: 220 },
//   {
//     id: "status",
//     label: "Status",
//     type: "status",
//     width: 140,
//     options: [
//       { label: "Active", value: "active", color: "bg-green-600" },
//       { label: "Inactive", value: "inactive", color: "bg-gray-500" },
//       { label: "Pending", value: "pending", color: "bg-yellow-500" },
//     ],
//   },
//   { id: "phone", label: "Phone", type: "phone", width: 160 },
//   { id: "company", label: "Company", type: "text", width: 180 },
//   { id: "tags", label: "Tags", type: "tags", width: 220 },
//   { id: "progress", label: "Progress", type: "progress", width: 160 },
// ];

// const initialGroups: Group[] = [
//   {
//     id: "active",
//     name: "Active Contacts",
//     color: "border-l-green-500",
//     collapsed: false,
//     rows: [
//       {
//         id: "1",
//         contact: "Robert Thompson",
//         email: "robert@amazon.com",
//         status: "active",
//         phone: "+1 734 844 2393",
//         company: "Amazon",
//         tags: ["enterprise"],
//         progress: 65,
//       },
//       {
//         id: "2",
//         contact: "Steven Scott",
//         email: "steven@google.com",
//         status: "active",
//         phone: "+1 415 373 9914",
//         company: "Google",
//         tags: ["partner"],
//         progress: 20,
//       },
//     ],
//   },
//   {
//     id: "inactive",
//     name: "Inactive Contacts",
//     color: "border-l-red-500",
//     collapsed: false,
//     rows: [],
//   },
// ];

// function useLocalStorage<T>(key: string, initial: T) {
//   const [state, setState] = useState<T>(() => {
//     if (typeof window === "undefined") return initial;
//     const raw = localStorage.getItem(key);
//     return raw ? (JSON.parse(raw) as T) : initial;
//   });
//   useEffect(() => {
//     if (typeof window !== "undefined")
//       localStorage.setItem(key, JSON.stringify(state));
//   }, [key, state]);
//   return [state, setState] as const;
// }

// export default function CRMDashboard() {
//   const [columns, setColumns] = useLocalStorage<ColumnDef[]>(
//     "crm.columns",
//     initialColumns
//   );
//   const [groups, setGroups] = useLocalStorage<Group[]>(
//     "crm.groups",
//     initialGroups
//   );
//   const [query, setQuery] = useLocalStorage<string>("crm.query", "");

//   const [selected, setSelected] = useState<{
//     g: number;
//     r: number;
//     c: number;
//   } | null>(null);

//   const totalLeads = useMemo(
//     () => groups.reduce((acc, g) => acc + g.rows.length, 0),
//     [groups]
//   );
//   const activeCount = useMemo(
//     () => groups.find((g) => g.id === "active")?.rows.length ?? 0,
//     [groups]
//   );

//   const addRow = (groupId: string) => {
//     const blank: Row = { id: crypto.randomUUID() };
//     columns.forEach((col) => {
//       const def = defaultFor(col.type);
//       (blank as any)[col.id] = def;
//     });
//     setGroups((prev) =>
//       prev.map((g) =>
//         g.id === groupId ? { ...g, rows: [blank, ...g.rows] } : g
//       )
//     );
//   };

//   const updateCell = (
//     groupId: string,
//     rowId: string,
//     columnId: string,
//     value: any
//   ) => {
//     setGroups((prev) =>
//       prev.map((g) =>
//         g.id !== groupId
//           ? g
//           : {
//               ...g,
//               rows: g.rows.map((r) =>
//                 r.id === rowId ? { ...r, [columnId]: value } : r
//               ),
//             }
//       )
//     );
//   };

//   const addColumn = (type: ColumnKind) => {
//     const id = `col_${type}_${Math.random().toString(36).slice(2, 7)}`;
//     const def: ColumnDef = { id, label: labelFor(type), type, width: 160 };
//     setColumns((prev) => [...prev, def]);
//     setGroups((prev) =>
//       prev.map((g) => ({
//         ...g,
//         rows: g.rows.map((r) => ({ ...r, [id]: defaultFor(type) })),
//       }))
//     );
//   };

//   const removeColumn = (id: string) => {
//     setColumns((prev) => prev.filter((c) => c.id !== id));
//     setGroups((prev) =>
//       prev.map((g) => ({
//         ...g,
//         rows: g.rows.map((r) => {
//           const { [id]: _, ...rest } = r;
//           return rest as Row;
//         }),
//       }))
//     );
//   };

//   const setColumnLabel = (id: string, label: string) =>
//     setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));

//   const toggleGroup = (id: string) =>
//     setGroups((prev) =>
//       prev.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g))
//     );

//   const filteredGroups = useMemo(() => {
//     if (!query) return groups;
//     const q = query.toLowerCase();
//     return groups.map((g) => ({
//       ...g,
//       rows: g.rows.filter((r) =>
//         Object.values(r).join(" ").toLowerCase().includes(q)
//       ),
//     }));
//   }, [groups, query]);

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (!selected) return;
//     const { g, r, c } = selected;
//     const group = filteredGroups[g];
//     if (!group) return;

//     const next = (ng: number, nr: number, nc: number) => {
//       setSelected({ g: ng, r: nr, c: nc });
//     };
//     switch (e.key) {
//       case "ArrowRight":
//         next(g, r, Math.min(columns.length - 1, c + 1));
//         break;
//       case "ArrowLeft":
//         next(g, r, Math.max(0, c - 1));
//         break;
//       case "ArrowDown":
//         next(g, Math.min(group.rows.length - 1, r + 1), c);
//         break;
//       case "ArrowUp":
//         next(g, Math.max(0, r - 1), c);
//         break;
//       case "Enter":
//       case "Tab":
//         next(g, r, Math.min(columns.length - 1, c + 1));
//         e.preventDefault();
//         break;
//     }
//   };

//   return (
//     <div
//       className="min-h-screen bg-gray-50"
//       onKeyDown={handleKeyDown}
//       tabIndex={0}
//     >
//       <div className="border-b bg-white px-6 py-3 sticky top-0 z-30">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <LayoutGrid className="h-5 w-5" />
//             <h1 className="text-lg font-semibold">Dashboard</h1>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
//               <Input
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Search contacts..."
//                 className="pl-8 w-72"
//               />
//             </div>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline" className="gap-2">
//                   <Filter className="h-4 w-4" /> Filters
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent className="w-56">
//                 <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
//                 <DropdownMenuSeparator />
//                 <DropdownMenuItem onClick={() => setQuery("@gmail.com")}>
//                   Email contains @gmail.com
//                 </DropdownMenuItem>
//                 <DropdownMenuItem onClick={() => setQuery("active")}>
//                   Status is Active
//                 </DropdownMenuItem>
//                 <DropdownMenuItem onClick={() => setQuery("")}>
//                   Clear filters
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button className="gap-2">
//                   <Plus className="h-4 w-4" /> New item
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent>
//                 {groups.map((g) => (
//                   <DropdownMenuItem key={g.id} onClick={() => addRow(g.id)}>
//                     Add to {g.name}
//                   </DropdownMenuItem>
//                 ))}
//               </DropdownMenuContent>
//             </DropdownMenu>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline" className="gap-2">
//                   <Columns3 className="h-4 w-4" /> Columns
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent className="w-56">
//                 <DropdownMenuLabel>Add column</DropdownMenuLabel>
//                 <DropdownMenuSeparator />
//                 {(
//                   [
//                     "text",
//                     "person",
//                     "email",
//                     "phone",
//                     "number",
//                     "status",
//                     "priority",
//                     "date",
//                     "location",
//                     "tags",
//                     "progress",
//                   ] as ColumnKind[]
//                 ).map((t) => (
//                   <DropdownMenuItem
//                     key={t}
//                     onClick={() => addColumn(t)}
//                     className="capitalize"
//                   >
//                     {t}
//                   </DropdownMenuItem>
//                 ))}
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </div>
//         </div>
//       </div>

//       <div className="px-6 pb-10">
//         <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
//           {/* Header row */}
//           <div className="flex border-b bg-gray-50">
//             <div className="w-12 px-4 py-3 border-r flex items-center">
//               <Checkbox />
//             </div>
//             {columns.map((col) => (
//               <div
//                 key={col.id}
//                 className="px-4 py-3 border-r flex-1 group relative"
//                 style={{ minWidth: col.width ?? 160 }}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-2">
//                     <CircleDashed className="h-3 w-3 text-muted-foreground" />
//                     <span
//                       className="text-sm font-medium text-gray-700 cursor-text"
//                       contentEditable
//                       suppressContentEditableWarning
//                       onBlur={(e) =>
//                         setColumnLabel(
//                           col.id,
//                           e.currentTarget.textContent || col.label
//                         )
//                       }
//                     >
//                       {col.label}
//                     </span>
//                   </div>
//                   {!col.required && (
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => removeColumn(col.id)}
//                       className="opacity-0 group-hover:opacity-100 p-1 h-6 w-6"
//                     >
//                       <X className="w-3 h-3 text-red-500" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Groups */}
//           {filteredGroups.map((group, gIdx) => (
//             <div key={group.id} className={`border-l-4 ${group.color}`}>
//               {/* Group header */}
//               <div className="bg-gray-50 border-b">
//                 <div className="flex items-center px-4 py-2">
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => toggleGroup(group.id)}
//                     className="p-0 h-auto mr-2"
//                   >
//                     <ChevronDown className="w-4 h-4" />
//                   </Button>
//                   <span className="font-medium text-sm text-gray-700">
//                     {group.name}
//                   </span>
//                   <Badge variant="secondary" className="ml-2">
//                     {group.rows.length} items
//                   </Badge>
//                 </div>
//               </div>

//               {/* Rows */}
//               {!group.collapsed && (
//                 <>
//                   {group.rows.map((row, rIdx) => (
//                     <div
//                       key={row.id}
//                       className="flex border-b hover:bg-gray-50"
//                     >
//                       <div className="w-12 px-4 py-3 border-r flex items-center">
//                         <Checkbox />
//                       </div>
//                       {columns.map((col, cIdx) => (
//                         <div
//                           key={col.id}
//                           className={`px-4 py-3 border-r flex-1 ${selected && selected.g === gIdx && selected.r === rIdx && selected.c === cIdx ? "ring-1 ring-blue-400" : ""}`}
//                           style={{ minWidth: col.width ?? 160 }}
//                           onClick={() =>
//                             setSelected({ g: gIdx, r: rIdx, c: cIdx })
//                           }
//                         >
//                           <DynamicCell
//                             column={col}
//                             value={row[col.id]}
//                             onChange={(v) =>
//                               updateCell(group.id, row.id, col.id, v)
//                             }
//                             onCommit={() =>
//                               setSelected((s) =>
//                                 s
//                                   ? {
//                                       ...s,
//                                       c: Math.min(columns.length - 1, s.c + 1),
//                                     }
//                                   : s
//                               )
//                             }
//                             autoFocus={
//                               !!selected &&
//                               selected.g === gIdx &&
//                               selected.r === rIdx &&
//                               selected.c === cIdx
//                             }
//                           />
//                         </div>
//                       ))}
//                     </div>
//                   ))}

//                   {/* Add row */}
//                   <div className="border-b">
//                     <div className="px-4 py-3">
//                       <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => addRow(group.id)}
//                         className="text-gray-500 font-normal"
//                       >
//                         + Add item
//                       </Button>
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // helpers
// function labelFor(t: ColumnKind) {
//   switch (t) {
//     case "text":
//       return "Text";
//     case "person":
//       return "Person";
//     case "email":
//       return "Email";
//     case "phone":
//       return "Phone";
//     case "number":
//       return "Number";
//     case "status":
//       return "Status";
//     case "priority":
//       return "Priority";
//     case "date":
//       return "Date";
//     case "location":
//       return "Location";
//     case "tags":
//       return "Tags";
//     case "progress":
//       return "Progress";
//   }
// }

// function defaultFor(t: ColumnKind): any {
//   switch (t) {
//     case "text":
//     case "person":
//     case "email":
//     case "phone":
//     case "location":
//       return "";
//     case "tags":
//       return [] as string[];
//     case "number":
//     case "progress":
//       return 0;
//     case "status":
//     case "priority":
//       return "";
//     case "date":
//       return "";
//   }
// }
