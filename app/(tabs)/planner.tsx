import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Calendar from "expo-calendar";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, EmptyState, IconButton, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { cancelStudyReminder, scheduleStudyReminder } from "@/lib/study-reminders";
import { mergeTaskDateTime, type TaskDatePickerMode } from "@/lib/task-date-time";
import { useStudy } from "@/lib/study-context";
import type { StudyTask, TaskKind } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

const kindLabel: Record<TaskKind, string> = { assignment: "واجب", exam: "اختبار", review: "مراجعة" };
type PickerMode = TaskDatePickerMode | null;

export default function PlannerScreen() {
  const { tasks, subjects, addTask, removeTask, updateTask } = useStudy();
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [kind, setKind] = useState<TaskKind>("assignment");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const sorted = tasks.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const closeForm = () => { setCreating(false); setEditingTask(null); setTitle(""); setDueDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); setKind("assignment"); setSubjectId(undefined); };
  const openCreate = () => { setEditingTask(null); setCreating(true); };
  const openEdit = (task: StudyTask) => { setEditingTask(task); setTitle(task.title); setDueDate(new Date(task.dueAt)); setKind(task.kind); setSubjectId(task.subjectId); setCreating(true); };
  const saveTask = async () => {
    if (!title.trim()) { Alert.alert("تحقق من البيانات", "اكتب عنوان الموعد قبل الحفظ."); return; }
    const cleanTitle = title.trim();
    if (editingTask) {
      const dueAt = dueDate.toISOString();
      try { await cancelStudyReminder(editingTask.notificationId); } catch { /* لا يمنع تنبيه قديم غير متاح حفظ التعديل المحلي. */ }
      updateTask(editingTask.id, { title: cleanTitle, dueAt, kind, subjectId, notificationId: undefined });
      if (editingTask.calendarEventId && Platform.OS !== "web") {
        try { await Calendar.updateEventAsync(editingTask.calendarEventId, { title: cleanTitle, startDate: dueDate, endDate: new Date(dueDate.getTime() + 60 * 60 * 1000), notes: `أضيف من تطبيق مُحاضِر · ${kindLabel[kind]}` }); } catch { updateTask(editingTask.id, { calendarEventId: undefined }); }
      }
      if (!editingTask.completed) {
        try { const notificationId = await scheduleStudyReminder(cleanTitle, dueAt, editingTask.id); if (notificationId) updateTask(editingTask.id, { notificationId }); } catch { /* يظل الموعد محفوظًا محليًا إن تعذر منح إذن التنبيهات. */ }
      }
      closeForm();
      return;
    }
    const id = addTask({ title: cleanTitle, dueAt: dueDate.toISOString(), kind, subjectId });
    try { const notificationId = await scheduleStudyReminder(cleanTitle, dueDate.toISOString(), id); if (notificationId) updateTask(id, { notificationId }); } catch { /* يظل الموعد محفوظًا محليًا إن تعذر منح إذن التنبيهات. */ }
    closeForm();
  };
  const toggleTask = async (task: StudyTask) => {
    updateTask(task.id, { completed: !task.completed });
    if (!task.completed) {
      try { await cancelStudyReminder(task.notificationId); } catch { /* لا يمنع خطأ نظامي إتمام المهمة محلياً. */ }
      updateTask(task.id, { notificationId: undefined });
      return;
    }
    try { const notificationId = await scheduleStudyReminder(task.title, task.dueAt, task.id); updateTask(task.id, { notificationId }); } catch { /* تبقى المهمة المفتوحة محفوظة حتى عند رفض إذن التنبيهات. */ }
  };
  const deleteTask = (task: StudyTask) => Alert.alert("حذف الموعد", `سيُحذف «${task.title}» من خطتك${task.calendarEventId ? " ومن التقويم المرتبط به" : ""}.`, [
    { text: "إلغاء", style: "cancel" },
    { text: "حذف", style: "destructive", onPress: () => void removeTaskWithSystemLinks(task) },
  ]);
  const removeTaskWithSystemLinks = async (task: StudyTask) => {
    try { await cancelStudyReminder(task.notificationId); } catch { /* يستمر الحذف المحلي إذا لم يعد التنبيه موجوداً. */ }
    if (task.calendarEventId && Platform.OS !== "web") {
      try { await Calendar.deleteEventAsync(task.calendarEventId); } catch { /* قد يكون الحدث حُذف من التقويم مسبقاً. */ }
    }
    removeTask(task.id);
  };
  const addToCalendar = async (task: StudyTask) => {
    if (Platform.OS === "web") { Alert.alert("يتوفر على الهاتف", "إضافة الموعد إلى تقويم الجهاز تحتاج تطبيق الهاتف."); return; }
    try {
      if (!(await Calendar.isAvailableAsync())) throw new Error("التقويم غير متاح على هذا الجهاز.");
      if (task.calendarEventId) { await Calendar.openEventInCalendarAsync({ id: task.calendarEventId }, { allowsEditing: true }); return; }
      const startDate = new Date(task.dueAt);
      const result = await Calendar.createEventInCalendarAsync({ title: task.title, startDate, endDate: new Date(startDate.getTime() + 60 * 60 * 1000), notes: `أضيف من تطبيق مُحاضِر · ${kindLabel[task.kind]}` }, {});
      if (result.id) updateTask(task.id, { calendarEventId: result.id });
      if (result.action === "canceled" || result.action === "deleted") return;
      Alert.alert("تم فتح التقويم", result.id ? "حُفظ ربط هذا الموعد بحدث التقويم ويمكنك تعديله لاحقاً من هنا." : "أُرسل الموعد إلى تقويم الجهاز. قد لا يعيد Android معرف الحدث بعد الحفظ.");
    } catch (error) { Alert.alert("تعذر فتح التقويم", error instanceof Error ? error.message : "تحقق من أذونات التقويم ثم حاول مرة أخرى."); }
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="مواعيدك الدراسية" title="خطتي" action={<IconButton icon="add" label="إضافة موعد" onPress={openCreate} />} /><ScrollView contentContainerStyle={styles.list}>{sorted.length ? sorted.map((task) => <TaskRow key={task.id} task={task} subjectName={subjects.find((subject) => subject.id === task.subjectId)?.title} onToggle={() => void toggleTask(task)} onCalendar={() => void addToCalendar(task)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task)} />) : <EmptyState icon="event-note" title="خطتك الدراسية جاهزة" description="أضف واجباً أو اختباراً أو جلسة مراجعة، واختر وقت التنبيه المحلي." action={<PrimaryButton label="إضافة موعد" icon="add" onPress={openCreate} />} />}</ScrollView><TaskForm visible={creating} editing={Boolean(editingTask)} title={title} dueDate={dueDate} kind={kind} subjectId={subjectId} subjects={subjects} onClose={closeForm} onTitle={setTitle} onDueDate={setDueDate} onKind={setKind} onSubject={setSubjectId} onSave={() => void saveTask()} /></ScreenContainer>;
}

function TaskRow({ task, subjectName, onToggle, onCalendar, onEdit, onDelete }: { task: StudyTask; subjectName?: string; onToggle: () => void; onCalendar: () => void; onEdit: () => void; onDelete: () => void }) { return <View style={[styles.task, task.completed && styles.completed]}><Pressable accessibilityRole="button" accessibilityLabel={task.completed ? "إعادة فتح الموعد" : "إتمام الموعد"} onPress={onToggle} style={styles.check}><MaterialIcons name={task.completed ? "check-circle" : "radio-button-unchecked"} size={25} color={task.completed ? appTheme.success : appTheme.primary} /></Pressable><View style={styles.taskCopy}><View style={styles.taskHead}><StatusPill label={kindLabel[task.kind]} tone={task.kind === "exam" ? "warning" : "primary"} /><Text style={[styles.taskTitle, task.completed && styles.strike]}>{task.title}</Text></View><Text style={styles.taskMeta}>{subjectName ?? "غير مرتبط بمادة"} · {formatDateTime(new Date(task.dueAt))}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="تعديل الموعد" onPress={onEdit} style={styles.edit}><MaterialIcons name="edit" size={19} color={appTheme.primary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={task.calendarEventId ? "فتح حدث التقويم" : "إضافة إلى تقويم الهاتف"} onPress={onCalendar} style={[styles.calendar, task.calendarEventId && styles.calendarLinked]}><MaterialIcons name={task.calendarEventId ? "event-available" : "event"} size={20} color={task.calendarEventId ? appTheme.success : appTheme.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="حذف الموعد" onPress={onDelete} style={styles.delete}><MaterialIcons name="delete-outline" size={19} color={appTheme.danger} /></Pressable></View>; }

function TaskForm({ visible, editing, title, dueDate, kind, subjectId, subjects, onClose, onTitle, onDueDate, onKind, onSubject, onSave }: { visible: boolean; editing: boolean; title: string; dueDate: Date; kind: TaskKind; subjectId?: string; subjects: ReturnType<typeof useStudy>["subjects"]; onClose: () => void; onTitle: (value: string) => void; onDueDate: (value: Date) => void; onKind: (value: TaskKind) => void; onSubject: (value: string | undefined) => void; onSave: () => void }) {
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const openPicker = () => setPickerMode(Platform.OS === "ios" ? "datetime" : "date");
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed" || !selected) { setPickerMode(null); return; }
    if (pickerMode === "date") {
      onDueDate(mergeTaskDateTime(dueDate, selected, "date"));
      setPickerMode(Platform.OS === "android" ? "time" : "datetime");
      return;
    }
    onDueDate(mergeTaskDateTime(dueDate, selected, pickerMode === "time" ? "time" : "datetime"));
    if (Platform.OS === "android") setPickerMode(null);
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.sheet}><View style={styles.sheetHeader}><IconButton icon="close" label="إغلاق" onPress={onClose} tone="neutral" /><Text style={styles.sheetTitle}>{editing ? "تعديل الموعد" : "موعد جديد"}</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.form}><Label text="العنوان" /><TextInput value={title} onChangeText={onTitle} style={styles.input} textAlign="right" returnKeyType="done" placeholder="مثال: تسليم البحث" placeholderTextColor="#94A3B8" /><Label text="الموعد" /><Pressable accessibilityRole="button" accessibilityLabel="اختيار تاريخ ووقت الموعد" onPress={openPicker} style={styles.datePickerButton}><MaterialIcons name="event" size={20} color={appTheme.primary} /><View style={styles.datePickerCopy}><Text style={styles.datePickerValue}>{formatDateTime(dueDate)}</Text><Text style={styles.datePickerHint}>اضغط لاختيار التاريخ والوقت من جهازك</Text></View></Pressable>{pickerMode ? <View style={styles.pickerPanel}><DateTimePicker value={dueDate} mode={pickerMode} is24Hour display={Platform.OS === "ios" ? "inline" : "default"} onChange={onPickerChange} />{Platform.OS === "ios" ? <Pressable onPress={() => setPickerMode(null)} style={styles.pickerClose}><Text style={styles.pickerCloseText}>تم</Text></Pressable> : null}</View> : null}<Label text="النوع" /><View style={styles.kindRow}>{(Object.keys(kindLabel) as TaskKind[]).map((item) => <Pressable key={item} onPress={() => onKind(item)} style={[styles.kind, kind === item && styles.kindActive]}><Text style={[styles.kindText, kind === item && styles.kindTextActive]}>{kindLabel[item]}</Text></Pressable>)}</View><Label text="المادة (اختياري)" /><View style={styles.subjectList}><Pressable onPress={() => onSubject(undefined)} style={[styles.subjectChip, !subjectId && styles.subjectChipActive]}><Text style={[styles.subjectText, !subjectId && styles.subjectTextActive]}>بدون مادة</Text></Pressable>{subjects.map((subject) => <Pressable key={subject.id} onPress={() => onSubject(subject.id)} style={[styles.subjectChip, subjectId === subject.id && styles.subjectChipActive]}><Text style={[styles.subjectText, subjectId === subject.id && styles.subjectTextActive]}>{subject.title}</Text></Pressable>)}</View><PrimaryButton label={editing ? "حفظ التعديل" : "حفظ الموعد"} icon="save" onPress={onSave} /></ScrollView></View></Modal>;
}

function formatDateTime(date: Date) { return date.toLocaleString("ar", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }

const styles = StyleSheet.create({ list: { gap: 11, paddingBottom: 28 }, task: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 10, padding: 14 }, completed: { opacity: 0.65 }, check: { padding: 2 }, taskCopy: { flex: 1 }, taskHead: { alignItems: "center", flexDirection: "row-reverse", gap: 8, justifyContent: "space-between" }, taskTitle: { color: appTheme.ink, flex: 1, fontSize: 15, fontWeight: "800", textAlign: "right" }, strike: { textDecorationLine: "line-through" }, taskMeta: { color: appTheme.muted, fontSize: 11, marginTop: 6, textAlign: "right" }, calendar: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 11, height: 36, justifyContent: "center", width: 36 }, calendarLinked: { backgroundColor: appTheme.successSoft }, edit: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 11, height: 36, justifyContent: "center", width: 36 }, delete: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 11, height: 36, justifyContent: "center", width: 36 }, sheet: { backgroundColor: appTheme.background, flex: 1 }, sheetHeader: { alignItems: "center", backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 20, paddingTop: 16 }, sheetTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800" }, spacer: { width: 58 }, form: { gap: 11, padding: 20, paddingBottom: 42 }, label: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, input: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 14, borderWidth: 1, color: appTheme.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 13 }, datePickerButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", gap: 10, minHeight: 58, paddingHorizontal: 13 }, datePickerCopy: { flex: 1 }, datePickerValue: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, datePickerHint: { color: appTheme.primary, fontSize: 11, marginTop: 2, textAlign: "right" }, pickerPanel: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 14, borderWidth: 1, overflow: "hidden" }, pickerClose: { alignItems: "center", backgroundColor: appTheme.primarySoft, justifyContent: "center", minHeight: 42 }, pickerCloseText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, kindRow: { flexDirection: "row-reverse", gap: 8 }, kind: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 11, flex: 1, padding: 11 }, kindActive: { backgroundColor: appTheme.primarySoft }, kindText: { color: appTheme.muted, fontSize: 13, fontWeight: "800" }, kindTextActive: { color: appTheme.primary }, subjectList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, subjectChip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 }, subjectChipActive: { backgroundColor: appTheme.primarySoft }, subjectText: { color: appTheme.muted, fontSize: 12, fontWeight: "700" }, subjectTextActive: { color: appTheme.primary } });
