import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { appTheme, subjectColors } from "@/lib/app-theme";
import { IconButton, PrimaryButton } from "@/components/study-ui";

export function FormSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <IconButton icon="close" label="إغلاق" onPress={onClose} tone="neutral" />
          <Text style={styles.sheetTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function YearForm({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState("");
  useEffect(() => { if (visible) setTitle(""); }, [visible]);
  return (
    <FormSheet visible={visible} title="سنة دراسية جديدة" onClose={onClose}>
      <FormHint>ستصبح هذه السنة هي السنة النشطة في التطبيق.</FormHint>
      <Field label="اسم السنة" value={title} onChangeText={setTitle} placeholder="مثال: ٢٠٢٦–٢٠٢٧" />
      <PrimaryButton label="إنشاء السنة" onPress={() => onSubmit(title)} />
    </FormSheet>
  );
}

export function SubjectForm({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (input: { title: string; color: string; hasPracticalSection: boolean; theoryInstructor: string; practicalInstructor: string }) => void }) {
  const [title, setTitle] = useState("");
  const [theoryInstructor, setTheoryInstructor] = useState("");
  const [practicalInstructor, setPracticalInstructor] = useState("");
  const [hasPracticalSection, setHasPracticalSection] = useState(false);
  const [color, setColor] = useState(subjectColors[0]);
  useEffect(() => {
    if (visible) {
      setTitle(""); setTheoryInstructor(""); setPracticalInstructor(""); setHasPracticalSection(false); setColor(subjectColors[0]);
    }
  }, [visible]);
  return (
    <FormSheet visible={visible} title="إضافة مادة" onClose={onClose}>
      <Field label="اسم المادة" value={title} onChangeText={setTitle} placeholder="مثال: علم الأدوية" />
      <Field label="مدرس النظري" value={theoryInstructor} onChangeText={setTheoryInstructor} placeholder="الاسم الكامل للمدرس" />
      <View style={styles.switchRow}>
        <View style={styles.switchText}><Text style={styles.fieldLabel}>للمادة جانب عملي</Text><Text style={styles.helper}>سيظهر قسمان منفصلان للحفظ: نظري وعملي.</Text></View>
        <Switch value={hasPracticalSection} onValueChange={setHasPracticalSection} trackColor={{ false: "#CBD5E1", true: "#A5B4FC" }} thumbColor={hasPracticalSection ? appTheme.primary : "#FFFFFF"} />
      </View>
      {hasPracticalSection ? <Field label="مدرس العملي" value={practicalInstructor} onChangeText={setPracticalInstructor} placeholder="يمكن أن يكون المدرس نفسه" /> : null}
      <Text style={styles.fieldLabel}>لون المادة</Text>
      <View style={styles.colorRow}>{subjectColors.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel="اختيار لون المادة" onPress={() => setColor(item)} style={[styles.colorChoice, { backgroundColor: item }, color === item && styles.colorChoiceActive]} />)}</View>
      <PrimaryButton label="حفظ المادة" onPress={() => onSubmit({ title, color, hasPracticalSection, theoryInstructor, practicalInstructor })} />
    </FormSheet>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" style={styles.input} textAlign="right" returnKeyType="done" /></View>;
}

function FormHint({ children }: { children: React.ReactNode }) { return <View style={styles.hint}><Text style={styles.hintText}>{children}</Text></View>; }

const styles = StyleSheet.create({
  sheet: { backgroundColor: appTheme.background, flex: 1 },
  sheetHeader: { alignItems: "center", backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sheetTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800", textAlign: "center" },
  headerSpacer: { width: 58 },
  formContent: { gap: 18, padding: 20, paddingBottom: 48 },
  hint: { backgroundColor: appTheme.primarySoft, borderRadius: 14, padding: 14 },
  hintText: { color: appTheme.primary, fontSize: 13, fontWeight: "600", lineHeight: 20, textAlign: "right" },
  field: { gap: 8 },
  fieldLabel: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" },
  input: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 14, borderWidth: 1, color: appTheme.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
  switchRow: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row-reverse", gap: 16, justifyContent: "space-between", padding: 15 },
  switchText: { flex: 1 },
  helper: { color: appTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 3, textAlign: "right" },
  colorRow: { flexDirection: "row-reverse", gap: 12, justifyContent: "flex-start" },
  colorChoice: { borderColor: "transparent", borderRadius: 18, borderWidth: 4, height: 34, width: 34 },
  colorChoiceActive: { borderColor: appTheme.ink },
});
