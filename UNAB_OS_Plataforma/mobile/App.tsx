import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from "react-native";

const { width } = Dimensions.get("window");

// Notion & Luxury Tokens
const TOKENS = {
  canvasSoft: "#f6f5f4",
  surface: "#ffffff",
  hairline: "#e6e6e6",
  primary: "#0075de",
  primaryActive: "#005bab",
  ink: "#000000",
  inkSecondary: "#31302e",
  inkMuted: "#615d59",
  inkFaint: "#a39e98",
  stickerPurple: "#d6b6f6",
  stickerTeal: "#2a9d99",
  stickerOrange: "#dd5b00",
  stickerPink: "#ff64c8",
  stickerGreen: "#1aae39",
  stickerSky: "#62aef0",
};

interface TaskItem {
  id: string;
  title: string;
  subject: string;
  day: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "finde";
  time: string;
  weight: string;
  priority: "Alta" | "Media" | "Normal";
  completed: boolean;
  notes: string;
  docente: string;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: "1",
    title: "Parcial 1: Dinámica y Mecanismos (4 Barras / Grashof)",
    subject: "Dinámica y Mecanismos",
    day: "viernes",
    time: "10:00 AM",
    weight: "25% Parcial 1",
    priority: "Alta",
    completed: false,
    notes: "Criterio de Grashof: S + L <= P + Q. Llevar calculadora programable.",
    docente: "Ing. Hernán Ospina",
  },
  {
    id: "2",
    title: "Taller: Teoremas de Thévenin y Norton",
    subject: "Circuitos Eléctricos",
    day: "martes",
    time: "11:59 PM",
    weight: "15% Portafolio",
    priority: "Media",
    completed: true,
    notes: "Calcular impedancias equivalentes en CA.",
    docente: "Ing. Ricardo Duarte",
  },
  {
    id: "3",
    title: "Entrega: Croquis 3D Botella CAD",
    subject: "Dibujo Asistido por Computador",
    day: "miercoles",
    time: "6:00 PM",
    weight: "15% Proyecto CAD",
    priority: "Normal",
    completed: false,
    notes: "Exportar en formato STEP y adjuntar plano normalizado con cotas.",
    docente: "Ing. Juan Manuel Argüello",
  },
  {
    id: "4",
    title: "Quiz: Transformadas de Laplace & EDOs",
    subject: "Cálculo Multivariable & EDO",
    day: "jueves",
    time: "8:00 AM",
    weight: "10% Quiz",
    priority: "Alta",
    completed: false,
    notes: "Propiedades de linealidad, convolución y traslación.",
    docente: "Dra. Leidy Johanna González",
  },
];

const CANONICAL_COURSES = [
  { id: "c1", name: "Dinámica y Mecanismos", code: "MEC-302", prof: "Ing. Hernán Ospina", enrolled: true, icon: "⚙️" },
  { id: "c2", name: "Circuitos Eléctricos", code: "CIR-301", prof: "Ing. Ricardo Duarte", enrolled: true, icon: "⚡" },
  { id: "c3", name: "Cálculo Multivariable & EDO", code: "MAT-202", prof: "Dra. Leidy Johanna González", enrolled: true, icon: "📐" },
  { id: "c4", name: "Ciencia de Materiales", code: "MAT-205", prof: "Dra. Martha Cecilia Jaimes", enrolled: true, icon: "🔬" },
  { id: "c5", name: "Física: Ondas y Partículas", code: "FIS-201", prof: "Dr. Christian Sarmiento", enrolled: true, icon: "🌊" },
  { id: "c6", name: "Estadística Inferencial", code: "EST-203", prof: "Prof. Área de Estadística", enrolled: true, icon: "📊" },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<"inicio" | "materias" | "estudio" | "jarvis">("inicio");
  const [selectedDay, setSelectedDay] = useState<TaskItem["day"]>("viernes");
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [courses, setCourses] = useState(CANONICAL_COURSES);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Pomodoro Timer state
  const [pomodoroSeconds, setPomodoroSeconds] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Jarvis Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: "user" | "jarvis"; text: string }>>([
    {
      id: "m1",
      sender: "jarvis",
      text: "¡Hola Daniel! Soy Jarvis, tu copiloto de Ingeniería Mecatrónica. ¿En qué tema o parcial necesitas apoyo hoy?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Pomodoro countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((sec) => sec - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      setIsTimerRunning(false);
      Alert.alert("🎉 Sesión Finalizada", "¡Completaste tu bloque de 45 minutos!");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroSeconds]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleToggleCourse = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enrolled: !c.enrolled } : c))
    );
  };

  const handleOpenDrawer = (task: TaskItem) => {
    setSelectedTask(task);
    setDrawerVisible(true);
  };

  const handleSaveDrawer = () => {
    if (!selectedTask) return;
    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? selectedTask : t)));
    setDrawerVisible(false);
  };

  const handleSendChatMessage = () => {
    const query = chatInput.trim();
    if (!query) return;

    const userMsg = { id: `u-${Date.now()}`, sender: "user" as const, text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Simulated Socratic mechatronics response
    setTimeout(() => {
      let botReply = "Analizando tu consulta académica...";
      const lower = query.toLowerCase();
      if (lower.includes("grashof") || lower.includes("mecanismo")) {
        botReply = "⚙️ En mecanismos de 4 barras: La condición de Grashof establece que si S + L ≤ P + Q, al menos una barra puede realizar una rotación continua completa de 360°. ¿Cuál es la barra fija en tu ensamble?";
      } else if (lower.includes("thevenin") || lower.includes("circuito")) {
        botReply = "⚡ Para calcular el equivalente de Thévenin: 1) Apaga fuentes independientes (tensión en corto, corriente en abierto) para hallar Rth. 2) Calcula el voltaje de circuito abierto Vth en terminales.";
      } else {
        botReply = `He procesado tu duda sobre "${query}". ¿Deseas que desglosamos la fórmula o programemos una sesión de estudio de 45 min?`;
      }
      setChatMessages((prev) => [...prev, { id: `j-${Date.now()}`, sender: "jarvis", text: botReply }]);
    }, 700);
  };

  const dayTasks = tasks.filter((t) => t.day === selectedDay);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={TOKENS.canvasSoft} />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerKicker}>Universidad OS · UNAB</Text>
          <Text style={styles.headerTitle}>UniNova Mobile</Text>
        </View>
        <View style={styles.avatarPill}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>DM</Text>
          </View>
          <View>
            <Text style={styles.userNameText}>Daniel Monoga</Text>
            <Text style={styles.userRoleText}>Ing. Mecatrónica</Text>
          </View>
        </View>
      </View>

      {/* BODY CONTENT BASED ON ACTIVE TAB */}
      <ScrollView style={styles.mainScrollView} contentContainerStyle={{ paddingBottom: 110 }}>
        {currentTab === "inicio" && (
          <View style={styles.tabContent}>
            {/* KPI BENTO GRID */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiNumber}>{courses.filter((c) => c.enrolled).length}</Text>
                <Text style={styles.kpiLabel}>Materias</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiNumber, { color: TOKENS.stickerOrange }]}>
                  {tasks.filter((t) => !t.completed).length}
                </Text>
                <Text style={styles.kpiLabel}>Pendientes</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiNumber, { color: TOKENS.stickerTeal }]}>32h</Text>
                <Text style={styles.kpiLabel}>Estudio</Text>
              </View>
            </View>

            {/* DAY SELECTOR BAR */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📋 Tablero Semanal</Text>
              <Text style={styles.sectionSub}>{dayTasks.length} tareas</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              {[
                { key: "lunes", label: "LUN" },
                { key: "martes", label: "MAR" },
                { key: "miercoles", label: "MIÉ" },
                { key: "jueves", label: "JUE" },
                { key: "viernes", label: "VIE" },
                { key: "finde", label: "FIN" },
              ].map((d) => {
                const isActive = selectedDay === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayPill, isActive && styles.dayPillActive]}
                    onPress={() => setSelectedDay(d.key as any)}
                  >
                    <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* TASKS LIST FOR SELECTED DAY */}
            {dayTasks.length > 0 ? (
              dayTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, task.completed && { opacity: 0.6 }]}
                  onPress={() => handleOpenDrawer(task)}
                >
                  <View style={styles.taskCardHeader}>
                    <View style={styles.tagPill}>
                      <Text style={styles.tagPillText}>📚 {task.subject}</Text>
                    </View>
                    <View
                      style={[
                        styles.priorityPill,
                        task.priority === "Alta"
                          ? { backgroundColor: "rgba(239, 68, 68, 0.12)" }
                          : { backgroundColor: "rgba(245, 158, 11, 0.12)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          task.priority === "Alta" ? { color: "#dc2626" } : { color: "#d97706" },
                        ]}
                      >
                        {task.priority === "Alta" ? "🔴 Alta" : "🟡 Media"}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.taskCardTitle,
                      task.completed && { textDecorationLine: "line-through", color: TOKENS.inkMuted },
                    ]}
                  >
                    {task.title}
                  </Text>

                  <View style={styles.taskCardFooter}>
                    <Text style={styles.taskMetaText}>⏰ {task.time}</Text>
                    <Text style={styles.taskMetaText}>📊 {task.weight}</Text>
                    <TouchableOpacity
                      style={[styles.checkBtn, task.completed && styles.checkBtnCompleted]}
                      onPress={() => handleToggleTask(task.id)}
                    >
                      <Text style={{ fontSize: 11, color: task.completed ? "#fff" : TOKENS.inkMuted }}>
                        {task.completed ? "✓" : "○"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>✨</Text>
                <Text style={styles.emptyTitle}>Sin entregas para este día</Text>
                <Text style={styles.emptyDesc}>Disfruta tu tiempo o adelanta lecturas con Jarvis.</Text>
              </View>
            )}
          </View>
        )}

        {currentTab === "materias" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>📚 Mis Asignaturas UNAB</Text>
            <Text style={styles.sectionSub}>Activa o desactiva las materias de tu semestre actual.</Text>

            {courses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 24 }}>{course.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseCode}>{course.code}</Text>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseProf}>👨‍🏫 {course.prof}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.enrollBtn, course.enrolled && styles.enrollBtnActive]}
                  onPress={() => handleToggleCourse(course.id)}
                >
                  <Text style={[styles.enrollBtnText, course.enrolled && styles.enrollBtnTextActive]}>
                    {course.enrolled ? "✅ Inscrita" : "➕ Inscribir"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {currentTab === "estudio" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>⏱️ Bloque de Estudio Pomodoro</Text>
            <Text style={styles.sectionSub}>Sesiones profundas de 45 minutos sin interrupciones.</Text>

            <View style={styles.timerBox}>
              <Text style={styles.timerCountdown}>{formatTimer(pomodoroSeconds)}</Text>
              <Text style={styles.timerStatus}>
                {isTimerRunning ? "🔥 Enfoque Profundo Activo" : "⏸️ Listo para iniciar"}
              </Text>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.timerActionBtn, { backgroundColor: isTimerRunning ? "#f59e0b" : TOKENS.primary }]}
                  onPress={() => setIsTimerRunning(!isTimerRunning)}
                >
                  <Text style={styles.timerActionBtnText}>{isTimerRunning ? "Pausar" : "▶ Iniciar 45 min"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.timerActionBtn, { backgroundColor: "#e2e8f0" }]}
                  onPress={() => {
                    setIsTimerRunning(false);
                    setPomodoroSeconds(45 * 60);
                  }}
                >
                  <Text style={[styles.timerActionBtnText, { color: TOKENS.ink }]}>Reiniciar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {currentTab === "jarvis" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🤖 Jarvis AI · Asistente</Text>
            <Text style={styles.sectionSub}>Copiloto socrático para Mecatrónica e Ingeniería.</Text>

            <View style={styles.chatBox}>
              {chatMessages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.chatBubble,
                    m.sender === "user" ? styles.chatBubbleUser : styles.chatBubbleJarvis,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      m.sender === "user" ? { color: "#ffffff" } : { color: TOKENS.ink },
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Pregúntale a Jarvis sobre fórmulas, quices..."
                placeholderTextColor={TOKENS.inkFaint}
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChatMessage}>
                <Text style={{ color: "#ffffff", fontWeight: "bold" }}>➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* TASK DETAIL NOTION MODAL / BOTTOM SHEET */}
      <Modal visible={drawerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            {selectedTask && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTag}>📚 {selectedTask.subject}</Text>
                  <TouchableOpacity onPress={() => setDrawerVisible(false)}>
                    <Text style={{ fontSize: 18, color: TOKENS.inkMuted }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.sheetTitleInput}
                  value={selectedTask.title}
                  onChangeText={(text) => setSelectedTask({ ...selectedTask, title: text })}
                  multiline
                />

                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>📅 Día:</Text>
                  <Text style={styles.propVal}>{selectedTask.day.toUpperCase()}</Text>
                </View>

                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>⏰ Hora:</Text>
                  <TextInput
                    style={styles.propInput}
                    value={selectedTask.time}
                    onChangeText={(text) => setSelectedTask({ ...selectedTask, time: text })}
                  />
                </View>

                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>📊 Ponderación:</Text>
                  <TextInput
                    style={styles.propInput}
                    value={selectedTask.weight}
                    onChangeText={(text) => setSelectedTask({ ...selectedTask, weight: text })}
                  />
                </View>

                <Text style={[styles.propLabel, { marginTop: 12, marginBottom: 4 }]}>📝 Notas & Fórmulas:</Text>
                <TextInput
                  style={styles.sheetNotesInput}
                  value={selectedTask.notes}
                  onChangeText={(text) => setSelectedTask({ ...selectedTask, notes: text })}
                  multiline
                  placeholder="Escribe requisitos o acuerdos del grupo..."
                />

                <TouchableOpacity style={styles.saveSheetBtn} onPress={handleSaveDrawer}>
                  <Text style={styles.saveSheetBtnText}>Guardar Cambios</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* LUXURY FLOATING MOBILE BOTTOM TAB BAR */}
      <View style={styles.bottomTabBar}>
        {[
          { key: "inicio", label: "Inicio", icon: "🏠" },
          { key: "materias", label: "Materias", icon: "📚" },
          { key: "estudio", label: "Pomodoro", icon: "⏱️" },
          { key: "jarvis", label: "Jarvis IA", icon: "🤖" },
        ].map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBarItem}
              onPress={() => setCurrentTab(tab.key as any)}
            >
              <Text style={{ fontSize: 20, transform: [{ scale: isActive ? 1.15 : 1 }] }}>{tab.icon}</Text>
              <Text style={[styles.tabBarLabel, isActive && styles.tabBarLabelActive]}>{tab.label}</Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.canvasSoft,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: TOKENS.surface,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.hairline,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    color: TOKENS.primary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TOKENS.ink,
    letterSpacing: -0.5,
  },
  avatarPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: TOKENS.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  userNameText: {
    fontSize: 11,
    fontWeight: "700",
    color: TOKENS.ink,
  },
  userRoleText: {
    fontSize: 9,
    color: TOKENS.inkMuted,
  },
  mainScrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: TOKENS.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    alignItems: "center",
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: TOKENS.primary,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: TOKENS.inkMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TOKENS.ink,
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 11,
    color: TOKENS.inkMuted,
    marginBottom: 12,
  },
  dayScroll: {
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TOKENS.surface,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    marginRight: 8,
  },
  dayPillActive: {
    backgroundColor: TOKENS.primary,
    borderColor: TOKENS.primary,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.inkSecondary,
  },
  dayPillTextActive: {
    color: "#ffffff",
  },
  taskCard: {
    backgroundColor: TOKENS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    marginBottom: 10,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tagPill: {
    backgroundColor: "rgba(0, 117, 222, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: TOKENS.primary,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  taskCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TOKENS.ink,
    marginBottom: 10,
    lineHeight: 18,
  },
  taskCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  taskMetaText: {
    fontSize: 10,
    color: TOKENS.inkMuted,
    fontWeight: "600",
  },
  checkBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: TOKENS.inkMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkBtnCompleted: {
    backgroundColor: TOKENS.stickerGreen,
    borderColor: TOKENS.stickerGreen,
  },
  emptyCard: {
    padding: 32,
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: TOKENS.hairline,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TOKENS.ink,
  },
  emptyDesc: {
    fontSize: 11,
    color: TOKENS.inkMuted,
    marginTop: 2,
  },
  courseCard: {
    backgroundColor: TOKENS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseCode: {
    fontSize: 9,
    fontWeight: "800",
    color: TOKENS.inkMuted,
  },
  courseName: {
    fontSize: 13,
    fontWeight: "700",
    color: TOKENS.ink,
  },
  courseProf: {
    fontSize: 10,
    color: TOKENS.inkSecondary,
    marginTop: 2,
  },
  enrollBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.primary,
  },
  enrollBtnActive: {
    backgroundColor: "rgba(26, 174, 57, 0.1)",
    borderColor: TOKENS.stickerGreen,
  },
  enrollBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: TOKENS.primary,
  },
  enrollBtnTextActive: {
    color: TOKENS.stickerGreen,
  },
  timerBox: {
    backgroundColor: TOKENS.surface,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    alignItems: "center",
  },
  timerCountdown: {
    fontSize: 54,
    fontWeight: "800",
    color: TOKENS.ink,
    letterSpacing: -1.5,
  },
  timerStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.inkMuted,
    marginTop: 4,
  },
  timerActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timerActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  chatBox: {
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    minHeight: 280,
    marginBottom: 12,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "85%",
  },
  chatBubbleUser: {
    backgroundColor: TOKENS.primary,
    alignSelf: "flex-end",
  },
  chatBubbleJarvis: {
    backgroundColor: TOKENS.canvasSoft,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: TOKENS.hairline,
  },
  chatText: {
    fontSize: 12,
    lineHeight: 17,
  },
  chatInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: TOKENS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    paddingHorizontal: 12,
    fontSize: 12,
    height: 42,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: TOKENS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomTabBar: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBarItem: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: TOKENS.inkMuted,
  },
  tabBarLabelActive: {
    color: TOKENS.primary,
    fontWeight: "800",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.primary,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: TOKENS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.hairline,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetTag: {
    fontSize: 11,
    fontWeight: "700",
    color: TOKENS.primary,
  },
  sheetTitleInput: {
    fontSize: 16,
    fontWeight: "800",
    color: TOKENS.ink,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.hairline,
    paddingBottom: 8,
    marginBottom: 12,
  },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  propLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.inkMuted,
  },
  propVal: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.ink,
  },
  propInput: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.ink,
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 120,
    textAlign: "right",
  },
  sheetNotesInput: {
    borderWidth: 1,
    borderColor: TOKENS.hairline,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    height: 80,
    textAlignVertical: "top",
    color: TOKENS.ink,
  },
  saveSheetBtn: {
    backgroundColor: TOKENS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  saveSheetBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
