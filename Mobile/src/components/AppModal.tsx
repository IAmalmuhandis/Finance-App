import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { CheckCircle, XCircle, AlertTriangle, Info, Trash2 } from "lucide-react-native";
import { THEME } from "../theme";

export type ModalType = "success" | "error" | "warning" | "info" | "confirm";

export interface AppModalProps {
  visible: boolean;
  type?: ModalType;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  destructive?: boolean;
}

const ICONS: Record<ModalType, React.FC<{ size: number; color: string }>> = {
  success:  CheckCircle,
  error:    XCircle,
  warning:  AlertTriangle,
  info:     Info,
  confirm:  Trash2,
};

const ICON_COLORS: Record<ModalType, string> = {
  success: THEME.colors.primary,
  error:   THEME.colors.accentAlert,
  warning: THEME.colors.gold,
  info:    THEME.colors.textSecondary,
  confirm: THEME.colors.accentAlert,
};

export default function AppModal({
  visible,
  type = "info",
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  destructive = false,
}: AppModalProps) {
  const Icon = ICONS[type];
  const iconColor = ICON_COLORS[type];
  const isConfirm = type === "confirm";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
            <Icon size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.btnRow}>
            {isConfirm && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                destructive && styles.destructiveBtn,
                isConfirm && { flex: 1 },
              ]}
              onPress={() => { onClose(); onConfirm?.(); }}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Convenience hook for simple modal state
export function useModal() {
  const [modal, setModal] = React.useState<Omit<AppModalProps, "onClose"> | null>(null);

  function show(opts: Omit<AppModalProps, "visible" | "onClose">) {
    setModal({ ...opts, visible: true });
  }

  function hide() {
    setModal(null);
  }

  const node = modal ? (
    <AppModal {...modal} visible={modal.visible} onClose={hide} />
  ) : null;

  return { show, hide, node };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: THEME.fonts.uiSemibold,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: THEME.fonts.ui,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.button,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: THEME.fonts.uiMedium,
    color: THEME.colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.button,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
  },
  destructiveBtn: {
    backgroundColor: THEME.colors.accentAlert,
  },
  confirmText: {
    fontSize: 15,
    fontFamily: THEME.fonts.uiSemibold,
    color: THEME.colors.textOnJade,
  },
  destructiveText: {
    color: "#fff",
  },
});
