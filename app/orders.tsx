import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSupabase } from "../context/SupabaseContext";
import { OrderWithItems } from "../types";
import Modal from "../components/Modal";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

type FilterStatus = "all" | "pending" | "sent";

export default function OrdersScreen() {
  const {
    isConfigured,
    orders,
    ordersLoading,
    ordersError,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  } = useSupabase();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOrderId, setTogglingOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "sent") return order.sent;
    if (filter === "pending") return !order.sent;
    return true;
  });

  const pendingCount = orders.filter((o) => !o.sent).length;
  const sentCount = orders.filter((o) => o.sent).length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const openDetailModal = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const handleToggleStatus = async (order: OrderWithItems) => {
    setTogglingOrderId(order.id);
    const newStatus = !order.sent;
    const success = await updateOrderStatus(order.id, newStatus);

    if (!success) {
      Alert.alert("Greška", "Nije moguće ažurirati status porudžbine");
    }

    // Update selected order if it's open
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, sent: newStatus });
    }
    setTogglingOrderId(null);
  };

  const handleDeleteOrder = (order: OrderWithItems) => {
    Alert.alert(
      "Obriši Porudžbinu",
      `Da li ste sigurni da želite da obrišete porudžbinu od "${order.name} ${order.lastname}"?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const success = await deleteOrder(order.id);
            if (!success) {
              Alert.alert("Greška", "Nije moguće obrisati porudžbinu");
            } else {
              setDetailModalVisible(false);
              setSelectedOrder(null);
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailCustomer = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (ordersLoading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="settings-outline" size={64} color={COLORS.primary} />
        <Text style={styles.configTitle}>Supabase nije konfigurisan</Text>
        <Text style={styles.configText}>
          Otvorite utils/supabase.ts i dodajte vaše Supabase kredencijale:{"\n\n"}
          - SUPABASE_URL{"\n"}
          - SUPABASE_ANON_KEY
        </Text>
      </View>
    );
  }

  if (ordersError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>{ordersError}</Text>
        <Button title="Pokušaj ponovo" onPress={fetchOrders} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Na čekanju</Text>
            <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
              {pendingCount}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Poslato</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              {sentCount}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ukupno</Text>
            <Text style={styles.summaryValue}>
              {totalRevenue.toLocaleString("sr-RS")} KM
            </Text>
          </View>
        </View>
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Sve ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "pending" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("pending")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "pending" && styles.filterTabTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Na čekanju ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "sent" && styles.filterTabActive]}
          onPress={() => setFilter("sent")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "sent" && styles.filterTabTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Poslato ({sentCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Nema porudžbina"
            message={
              filter === "all"
                ? "Porudžbine će se pojaviti ovdje kada kupci naruče"
                : filter === "pending"
                ? "Nema porudžbina na čekanju"
                : "Nema poslatih porudžbina"
            }
          />
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => openDetailModal(order)}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderTitleRow}>
                      <Text style={styles.customerName}>
                        {order.name} {order.lastname}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: order.sent ? COLORS.success : COLORS.primary,
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {order.sent ? "Poslato" : "Na čekanju"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {order.address}, {order.city}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>
                        {formatDate(order.created_at)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="cube" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>
                        {order.items.length} artikala
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <Text style={styles.totalAmount}>
                      {order.total.toLocaleString("sr-RS")} KM
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.quickStatusButton,
                        {
                          backgroundColor: order.sent ? COLORS.borderMedium : COLORS.success,
                        },
                      ]}
                      disabled={togglingOrderId === order.id}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(order);
                      }}
                    >
                      {togglingOrderId === order.id ? (
                        <ActivityIndicator size="small" color={order.sent ? COLORS.textSecondary : COLORS.surface} />
                      ) : (
                        <>
                          <Ionicons
                            name={order.sent ? "close" : "checkmark"}
                            size={16}
                            color={order.sent ? COLORS.textSecondary : COLORS.surface}
                          />
                          <Text
                            style={[
                              styles.quickStatusText,
                              { color: order.sent ? COLORS.textSecondary : COLORS.surface },
                            ]}
                          >
                            {order.sent ? "Poništi" : "Označi poslato"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchOrders}>
        <Ionicons name="refresh" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Order Detail Modal */}
      <Modal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedOrder(null);
        }}
        title="Detalji Porudžbine"
      >
        {selectedOrder && (
          <>
            {/* Customer Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kupac</Text>
              <Text style={styles.customerFullName}>
                {selectedOrder.name} {selectedOrder.lastname}
              </Text>

              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCallCustomer(selectedOrder.phone)}
                >
                  <Ionicons name="call" size={20} color={COLORS.success} />
                  <Text style={styles.contactButtonText}>
                    {selectedOrder.phone}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleEmailCustomer(selectedOrder.email)}
                >
                  <Ionicons name="mail" size={20} color={COLORS.info} />
                  <Text style={styles.contactButtonText}>
                    {selectedOrder.email}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adresa dostave</Text>
              <View style={styles.addressContainer}>
                <Ionicons name="location" size={20} color={COLORS.danger} />
                <Text style={styles.addressText}>
                  {selectedOrder.address}, {selectedOrder.city}
                </Text>
              </View>
            </View>

            {/* Order Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stavke</Text>
              {selectedOrder.items.map((item, index) => (
                <View key={item.id || index} style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>
                      {item.product?.product_name || "Nepoznati proizvod"}
                    </Text>
                    <Text style={styles.orderItemOption}>
                      {item.price_option?.size || "N/A"} x {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    {(
                      (parseFloat(item.price_option?.price || "0") *
                        item.quantity)
                    ).toLocaleString("sr-RS")}{" "}
                    KM
                  </Text>
                </View>
              ))}

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Ukupno:</Text>
                <Text style={styles.totalValue}>
                  {selectedOrder.total.toLocaleString("sr-RS")} KM
                </Text>
              </View>
            </View>

            {/* Order Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informacije</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Datum:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(selectedOrder.created_at)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusBadgeLarge,
                    {
                      backgroundColor: selectedOrder.sent
                        ? COLORS.success
                        : COLORS.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedOrder.sent ? "checkmark-circle" : "time"}
                    size={16}
                    color={COLORS.surface}
                  />
                  <Text style={styles.statusTextLarge}>
                    {selectedOrder.sent ? "Poslato" : "Na čekanju"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                title={selectedOrder.sent ? "Označi kao neposlato" : "Označi kao poslato"}
                onPress={() => handleToggleStatus(selectedOrder)}
                loading={togglingOrderId === selectedOrder.id}
                style={{ marginBottom: SPACING.md }}
              />
              <Button
                title="Obriši porudžbinu"
                onPress={() => handleDeleteOrder(selectedOrder)}
                variant="secondary"
                style={{ backgroundColor: COLORS.dangerLight }}
              />
            </View>
          </>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxxl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    textAlign: "center",
    marginVertical: SPACING.lg,
  },
  configTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  configText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.success,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  filterTabTextActive: {
    color: COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  ordersList: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  orderCard: {
    marginBottom: 0,
  },
  orderHeader: {
    marginBottom: SPACING.md,
  },
  orderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.surface,
  },
  orderDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
  },
  totalAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.success,
  },
  quickStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  quickStatusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  refreshButton: {
    position: "absolute",
    bottom: SPACING.xxl,
    right: SPACING.xxl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
  section: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  customerFullName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  contactRow: {
    marginBottom: SPACING.sm,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  contactButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
  },
  addressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    flex: 1,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  orderItemOption: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.success,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.primaryDark,
  },
  totalValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.success,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  statusTextLarge: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.surface,
  },
  modalActions: {
    marginTop: SPACING.sm,
  },
});
