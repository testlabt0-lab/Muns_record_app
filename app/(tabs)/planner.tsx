import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Calendar from "expo-calendar";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, EmptyState, IconButton, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { cancelStudyReminder, scheduleStudyReminder } from "@/lib/study-reminders";
import { useStudy } from "@/lib/study-context";
import type { StudyTask, TaskKind } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

const kindLabel: Record<TaskKind, string> = { assignment: "واجب", exam: "اختبار", review: "مراجعة" };

export default function PlannerScreen() {
  const { tasks, subjects, addTask, updateTask } = useStudy();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [dueText, setDueText] = useState("");
  const [kind, setKind] = useState<TaskKind>("assignment");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const sorted = tasks.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const saveTask = async () => {
    const dueDate = new Date(dueText.trim());
    if (!title.trim() || Number.isNaN(dueDate.getTime())) { Alert.alert("تحقق من البيانات", "اكتب عنواناً وتاريخاً بصيغة 2026-12-20 09:00."); return; }
    const id = addTask({ title: title.trim(), dueAt: dueDate.toISOString(), kind, subjectId });
    try { const notificationId = await scheduleStudyReminder(title.trim(), dueDate.toISOString(), id); if (notificationId) updateTask(id, { notificationId }); } catch { /* Task remains local even if notification permission is unavailable. */ }
    setCreating(false); setTitle(""); setDueText(""); setKind("assignment"); setSubjectId(undefined);
  };

  const toggleTask = async (task: StudyTask) => {
    updateTask(task.id, { completed: !task.completed });
    if (!task.completed) await cancelStudyReminder(task.notificationId);
  };
  const addToCalendar = async (task: StudyTask) => {
    if (Platform.OS === "web") { Alert.alert("يتوفر على الهاتف", "إضافة الموعد إلى تقويم الجهاز تحتاج تطبيق الهاتف."); return; }
    try {
      if (!(await Calendar.isAvailableAsync())) throw new Error("التقويم غير متاح على هذا الجهاز.");
      if (task.calendarEventId) {
        await Calendar.openEventInCalendarAsync({ id: task.calendarEventId }, { allowsEditing: true });
        return;
      }
      const startDate = new Date(task.dueAt);
      const result = await Calendar.createEventInCalendarAsync({ title: task.title, startDate, endDate: new Date(startDate.getTime() + 60 * 60 * 1000), notes: `أضيف من تطبيق مُحاضِر · ${kindLabel[task.kind]}` }, {});
      if (result.id) updateTask(task.id, { calendarEventId: result.id });
      if (result.action === "canceled" || result.action === "deleted") return;
      Alert.alert("تم فتح التقويم", result.id ? "حُفظ ربط هذا الموعد بحدث التقويم ويمكنك تعديله لاحقاً من هنا." : "أُرسل الموعد إلى تقويم الجهاز. قد لا يعيد Android معرف الحدث بعد الحفظ.");
    } catch (error) { Alert.alert("تعذر فتح التقويم", error instanceof Error ? error.message : "تحقق من أذونات التقويم ثم حاول مرة أخرى."); }
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="مواعيدك الدراسية" title="خطتي" action={<IconButton icon="add" label="إضافة موعد" onPress={() => setCreating(true)} />} /><ScrollView contentContainerStyle={styles.list}>{sorted.length ? sorted.map((task) => <TaskRow key={task.id} task={task} subjectName={subjects.find((subject) => subject.id === task.subjectId)?.title} onToggle={() => void toggleTask(task)} onCalendar={() => void addToCalendar(task)} />) : <EmptyState icon="event-note" title="خطتك الدراسية جاهزة" description="أضف واجباً أو اختباراً أو جلسة مراجعة، واختر وقت التنبيه المحلي." action={<PrimaryButton label="إضافة موعد" icon="add" onPress={() => setCreating(true)} />} />}</ScrollView><TaskForm visible={creating} title={title} dueText={dueText} kind={kind} subjectId={subjectId} subjects={subjects} onClose={() => setCreating(false)} onTitle={setTitle} onDue={setDueText} onKind={setKind} onSubject={setSubjectId} onSave={() => void saveTask()} /></ScreenContainer>;
}

function TaskRow({ task, subjectName, onToggle, onCalendar }: { task: StudyTask; subjectName?: string; onToggle: () => void; onCalendar: () => void }) { return <View style={[styles.task, task.completed && styles.completed]}><Pressable onPress={onToggle} style={styles.check}>{<MaterialIcons name={task.completed ? "check-circle" : "radio-button-unchecked"} size={25} color={task.completed ? appTheme.success : appTheme.primary} />}</Pressable><View style={styles.taskCopy}><View style={styles.taskHead}><StatusPill label={kindLabel[task.kind]} tone={task.kind === "exam" ? "warning" : "primary"} /><Text style={[styles.taskTitle, task.completed && styles.strike]}>{task.title}</Text></View><Text style={styles.taskMeta}>{subjectName ?? "غير مرتبط بمادة"} · {new Date(task.dueAt).toLocaleString("ar", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text></View><Pressable accessibilityLabel={task.calendarEventId ? "فتح حدث التقويم" : "إضافة إلى تقويم الهاتف"} onPress={onCalendar} style={[styles.calendar, task.calendarEventId && styles.calendarLinked]}><MaterialIcons name={task.calendarEventId ? "event-available" : "event"} size={20} color={task.calendarEventId ? appTheme.success : appTheme.muted} /></Pressable></View>; }

function TaskForm({ visible, title, dueText, kind, subjectId, subjects, onClose, onTitle, onDue, onKind, onSubject, onSave }: { visible: boolean; title: string; dueText: string; kind: TaskKind; subjectId?: string; subjects: ReturnType<typeof useStudy>["subjects"]; onClose: () => void; onTitle: (value: string) => void; onDue: (value: string) => void; onKind: (value: TaskKind) => void; onSubject: (value: string | undefined) => void; onSave: () => void }) { return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.sheet}><View style={styles.sheetHeader}><IconButton icon="close" label="إغلاق" onPress={onClose} tone="neutral" /><Text style={styles.sheetTitle}>موعد جديد</Text><View style={styles.spacer} /></View><ScrollView contentContainerStyle={styles.form}><Label text="العنوان" /><TextInput value={title} onChangeText={onTitle} style={styles.input} textAlign="right" placeholder="مثال: تسليم البحث" placeholderTextColor="#94A3B8" /><Label text="الموعد" /><TextInput value={dueText} onChangeText={onDue} style={styles.input} textAlign="right" placeholder="2026-12-20 09:00" placeholderTextColor="#94A3B8" /><Label text="النوع" /><View style={styles.kindRow}>{(Object.keys(kindLabel) as TaskKind[]).map((item) => <Pressable key={item} onPress={() => onKind(item)} style={[styles.kind, kind === item && styles.kindActive]}><Text style={[styles.kindText, kind === item && styles.kindTextActive]}>{kindLabel[item]}</Text></Pressable>)}</View><Label text="المادة (اختياري)" /><View style={styles.subjectList}><Pressable onPress={() => onSubject(undefined)} style={[styles.subjectChip, !subjectId && styles.subjectChipActive]}><Text style={[styles.subjectText, !subjectId && styles.subjectTextActive]}>بدون مادة</Text></Pressable>{subjects.map((subject) => <Pressable key={subject.id} onPress={() => onSubject(subject.id)} style={[styles.subjectChip, subjectId === subject.id && styles.subjectChipActive]}><Text style={[styles.subjectText, subjectId === subject.id && styles.subjectTextActive]}>{subject.title}</Text></Pressable>)}</View><PrimaryButton label="حفظ الموعد" icon="save" onPress={onSave} /></ScrollView></View></Modal>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }

const styles = StyleSheet.create({ list: { gap: 11, paddingBottom: 28 }, task: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 10, padding: 14 }, completed: { opacity: 0.65 }, check: { padding: 2 }, taskCopy: { flex: 1 }, taskHead: { alignItems: "center", flexDirection: "row-reverse", gap: 8, justifyContent: "space-between" }, taskTitle: { color: appTheme.ink, flex: 1, fontSize: 15, fontWeight: "800", textAlign: "right" }, strike: { textDecorationLine: "line-through" }, taskMeta: { color: appTheme.muted, fontSize: 11, marginTop: 6, textAlign: "right" }, calendar: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 11, height: 36, justifyContent: "center", width: 36 }, calendarLinked: { backgroundColor: appTheme.successSoft }, sheet: { backgroundColor: appTheme.background, flex: 1 }, sheetHeader: { alignItems: "center", backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 20, paddingTop: 16 }, sheetTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800" }, spacer: { width: 58 }, form: { gap: 11, padding: 20, paddingBottom: 42 }, label: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, input: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 14, borderWidth: 1, color: appTheme.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 13 }, kindRow: { flexDirection: "row-reverse", gap: 8 }, kind: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 11, flex: 1, padding: 11 }, kindActive: { backgroundColor: appTheme.primarySoft }, kindText: { color: appTheme.muted, fontSize: 13, fontWeight: "800" }, kindTextActive: { color: appTheme.primary }, subjectList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, subjectChip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 }, subjectChipActive: { backgroundColor: appTheme.primarySoft }, subjectText: { color: appTheme.muted, fontSize: 12, fontWeight: "700" }, subjectTextActive: { color: appTheme.primary } });
