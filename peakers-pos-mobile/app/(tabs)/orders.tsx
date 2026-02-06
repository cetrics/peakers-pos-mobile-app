import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const API = "http://192.168.1.66:5000";
const { width: screenWidth } = Dimensions.get("window");

type Order = {
  sale_id: number;
  order_number: string;
  customer_name: string;
  total_price: number;
  payment_type: string;
  sale_date: string;
  profit?: number;
  status: string;
  vat: number;
  discount: number;
  items: OrderItem[];
  customer_id?: number;
};

type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  product_price: number;
  subtotal: number;
  buying_price?: number;
};

type CustomerStats = {
  name: string;
  count: number;
};

type OrdersResponse = {
  orders: Order[];
};

const OrdersMobile = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [topCustomersCount, setTopCustomersCount] = useState(5);
  const [showTopCustomers, setShowTopCustomers] = useState(false);
  const [customerStats, setCustomerStats] = useState<CustomerStats[]>([]);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get<OrdersResponse>(`${API}/get-orders`);

      const processedOrders: Order[] = response.data.orders.map((order) => ({
        ...order,
        total_price: Number(order.total_price),
        vat: Number(order.vat),
        discount: Number(order.discount),
        items: order.items.map((item) => ({
          ...item,
          product_price: Number(item.product_price),
          subtotal: Number(item.subtotal),
        })),
      }));

      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
      calculateCustomerStats(processedOrders);
      setLoading(false);
    } catch (err) {
      setError("Error loading orders");
      setLoading(false);
    }
  };

  // Calculate customer statistics
  const calculateCustomerStats = (ordersList: Order[]) => {
    const counts: Record<string, number> = {};
    ordersList.forEach((order) => {
      const customer = order.customer_name || "Guest";
      counts[customer] = (counts[customer] || 0) + 1;
    });

    const sortedStats = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setCustomerStats(sortedStats);
  };

  // Apply filters
  const applyFilters = () => {
    let result = [...orders];

    // Date filter
    if (startDate && endDate) {
      const start = dayjs(startDate).startOf("day");
      const end = dayjs(endDate).endOf("day");

      result = result.filter((order) => {
        const orderDate = dayjs(order.sale_date);
        return orderDate.isAfter(start) && orderDate.isBefore(end);
      });
    }

    // Top customers filter
    if (showTopCustomers) {
      const topCustomerNames = customerStats
        .slice(0, topCustomersCount)
        .map((customer) => customer.name);
      result = result.filter((order) =>
        topCustomerNames.includes(order.customer_name || "Guest"),
      );
    }

    // Payment type filter
    if (paymentTypeFilter !== "all") {
      result = result.filter(
        (order) => order.payment_type === paymentTypeFilter,
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter);
    }

    // Search filter
    if (search) {
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(search.toLowerCase()) ||
          (order.customer_name || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => dayjs(b.sale_date).diff(dayjs(a.sale_date)));

    setFilteredOrders(result);
    setCurrentPage(1);
    setFilterModalVisible(false);
  };

  // Reset filters
  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setShowTopCustomers(false);
    setPaymentTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setFilteredOrders(orders);
  };

  // Handle status change
  const handleStatusChange = async (saleId: number, newStatus: string) => {
    try {
      await axios.post(`${API}/update-order-status`, {
        sale_id: saleId,
        status: newStatus,
      });

      // Update local state
      setOrders(
        orders.map((order) =>
          order.sale_id === saleId ? { ...order, status: newStatus } : order,
        ),
      );

      setFilteredOrders(
        filteredOrders.map((order) =>
          order.sale_id === saleId ? { ...order, status: newStatus } : order,
        ),
      );

      Alert.alert("Success", `Order marked as ${newStatus.toUpperCase()}`);
    } catch (err) {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#2e7d32";
      case "voided":
        return "#F44336";
      case "refunded":
        return "#F5A100";
      default:
        return "#666";
    }
  };

  // Calculate totals
  const calculateTotal = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_price, 0);
  };

  const calculateTotalProfit = () => {
    return filteredOrders.reduce((sum, order) => sum + (order.profit || 0), 0);
  };

  // Pagination
  const indexOfLastOrder = currentPage * rowsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - rowsPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder,
  );
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [
    showTopCustomers,
    topCustomersCount,
    paymentTypeFilter,
    statusFilter,
    search,
  ]);

  // Render order card
  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{item.order_number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="account" size={16} color="#666" />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.customer_name || "Guest"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="calendar" size={16} color="#666" />
          <Text style={styles.infoText}>
            {dayjs
              .utc(item.sale_date)
              .tz("Africa/Nairobi")
              .format("MMM D, YYYY")}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="credit-card" size={16} color="#666" />
          <Text style={styles.infoText}>{item.payment_type}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.totalLabelsmall}>Total</Text>
          <Text style={styles.totalAmount}>
            Ksh {item.total_price.toFixed(2)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.profitLabel}>Profit</Text>
          <Text style={styles.profitAmount}>
            Ksh {(item.profit || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.changeStatusBtn}
        onPress={() => {
          Alert.alert("Change Status", "Select new status", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Completed",
              onPress: () => handleStatusChange(item.sale_id, "completed"),
            },
            {
              text: "Voided",
              onPress: () => handleStatusChange(item.sale_id, "voided"),
            },
            {
              text: "Refunded",
              onPress: () => handleStatusChange(item.sale_id, "refunded"),
            },
          ]);
        }}
      >
        <Text style={styles.changeStatusText}>Change Status</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text>
                    {startDate
                      ? dayjs(startDate).format("MMM D, YYYY")
                      : "Start Date"}
                  </Text>
                </TouchableOpacity>
                <Text>to</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text>
                    {endDate
                      ? dayjs(endDate).format("MMM D, YYYY")
                      : "End Date"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Top Customers */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Top Customers</Text>
              <View style={styles.checkboxRow}>
                <Text>Show top customers</Text>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    showTopCustomers && styles.checkboxChecked,
                  ]}
                  onPress={() => setShowTopCustomers(!showTopCustomers)}
                >
                  {showTopCustomers && (
                    <Icon name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              {showTopCustomers && (
                <View style={styles.numberPicker}>
                  <Text>Show top:</Text>
                  <View style={styles.numberButtons}>
                    {[3, 5, 10, 15].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.numberButton,
                          topCustomersCount === num &&
                            styles.numberButtonActive,
                        ]}
                        onPress={() => setTopCustomersCount(num)}
                      >
                        <Text
                          style={[
                            styles.numberButtonText,
                            topCustomersCount === num &&
                              styles.numberButtonTextActive,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Payment Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Payment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["all", "Cash", "Mpesa", "Credit Card"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      paymentTypeFilter === type && styles.filterChipActive,
                    ]}
                    onPress={() => setPaymentTypeFilter(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        paymentTypeFilter === type &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {type === "all" ? "All" : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["all", "completed", "voided", "refunded"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.filterChipActive,
                      status !== "all" && {
                        backgroundColor: getStatusColor(status),
                      },
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status === "all" ? "All" : status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Rows Per Page */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rows Per Page</Text>
              <View style={styles.numberPicker}>
                <View style={styles.numberButtons}>
                  {[15, 50, 100, 250].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.numberButton,
                        rowsPerPage === num && styles.numberButtonActive,
                      ]}
                      onPress={() => setRowsPerPage(num)}
                    >
                      <Text
                        style={[
                          styles.numberButtonText,
                          rowsPerPage === num && styles.numberButtonTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render order details modal
  const renderOrderDetailsModal = () => (
    <Modal visible={modalVisible} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.detailsContent}>
          {selectedOrder && (
            <>
              {/* Order Header */}
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsOrderNumber}>
                  #{selectedOrder.order_number}
                </Text>
                <View
                  style={[
                    styles.detailsStatusBadge,
                    { backgroundColor: getStatusColor(selectedOrder.status) },
                  ]}
                >
                  <Text style={styles.detailsStatusText}>
                    {selectedOrder.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Customer</Text>
                    <Text style={styles.infoValue}>
                      {selectedOrder.customer_name || "Guest"}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>
                      {dayjs
                        .utc(selectedOrder.sale_date)
                        .tz("Africa/Nairobi")
                        .format("MMM D, YYYY HH:mm")}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Payment</Text>
                    <Text style={styles.infoValue}>
                      {selectedOrder.payment_type}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemPrice}>
                        Ksh {item.subtotal.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemQty}>
                        {item.quantity} × Ksh {item.product_price.toFixed(2)}
                      </Text>
                      {item.buying_price && (
                        <Text style={styles.itemCost}>
                          Cost: Ksh {item.buying_price.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Order Summary */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      Ksh{" "}
                      {(
                        selectedOrder.total_price -
                        selectedOrder.vat +
                        selectedOrder.discount
                      ).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>VAT</Text>
                    <Text style={styles.summaryValue}>
                      Ksh {selectedOrder.vat.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={styles.summaryValue}>
                      Ksh {selectedOrder.discount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      Ksh {selectedOrder.total_price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Profit</Text>
                    <Text style={styles.profitValue}>
                      Ksh {(selectedOrder.profit || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Render customer stats modal
  const renderStatsModal = () => (
    <Modal visible={statsModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.statsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Customer Statistics</Text>
            <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.statsContent}>
            {customerStats.slice(0, 15).map((customer, index) => (
              <View key={customer.name} style={styles.statRow}>
                <View style={styles.statRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.statName} numberOfLines={1}>
                  {customer.name}
                </Text>
                <View style={styles.statCount}>
                  <Text style={styles.countText}>{customer.count} orders</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setStatsModalVisible(true)}
          >
            <Icon name="chart-bar" size={24} color="#0B1446" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Icon name="filter" size={24} color="#0B1446" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          placeholder="Search orders..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Summary Cards - FIXED: Removed ScrollView */}
      <View style={styles.summaryCardsContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Orders</Text>
          <Text style={styles.summaryCardValue}>{filteredOrders.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Revenue</Text>
          <Text style={styles.summaryCardValue}>
            Ksh {calculateTotal().toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Profit</Text>
          <Text style={styles.summaryCardValue}>
            Ksh {calculateTotalProfit().toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filter Info */}
      {(showTopCustomers ||
        paymentTypeFilter !== "all" ||
        statusFilter !== "all") && (
        <View style={styles.filterInfo}>
          <Icon name="filter" size={16} color="#0B1446" />
          <Text style={styles.filterInfoText}>
            {showTopCustomers && `Top ${topCustomersCount} customers`}
            {showTopCustomers &&
              (paymentTypeFilter !== "all" || statusFilter !== "all") &&
              ", "}
            {paymentTypeFilter !== "all" && `${paymentTypeFilter}`}
            {paymentTypeFilter !== "all" && statusFilter !== "all" && ", "}
            {statusFilter !== "all" && `${statusFilter}`}
          </Text>
          <TouchableOpacity
            onPress={resetFilters}
            style={styles.clearFiltersBtn}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading or Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B1446" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <>
          {/* Orders List - FIXED: Added flex: 1 */}
          <View style={styles.ordersContainer}>
            <FlatList
              data={currentOrders}
              keyExtractor={(item) => item.sale_id.toString()}
              renderItem={renderOrderCard}
              contentContainerStyle={styles.ordersList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="package-variant" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No orders found</Text>
                  <Text style={styles.emptySubtext}>
                    Try changing your filters
                  </Text>
                </View>
              }
            />

            {/* Pagination */}
            {filteredOrders.length > rowsPerPage && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Icon
                    name="chevron-left"
                    size={20}
                    color={currentPage === 1 ? "#ccc" : "#0B1446"}
                  />
                </TouchableOpacity>

                <Text style={styles.paginationText}>
                  Page {currentPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages &&
                      styles.paginationButtonDisabled,
                  ]}
                  onPress={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={currentPage === totalPages ? "#ccc" : "#0B1446"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {/* Modals */}
      {renderFilterModal()}
      {renderOrderDetailsModal()}
      {renderStatsModal()}

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0B1446",
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  summaryCards: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#fff",
    padding: 12, // Reduced from 16
    borderRadius: 10, // Slightly smaller radius
    flex: 1,
    marginHorizontal: 4, // Small margin between cards
    minHeight: 70, // Fixed height
    justifyContent: "center", // Center content vertically
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryCardLabel: {
    fontSize: 11, // Smaller font
    color: "#666",
    marginBottom: 2, // Reduced spacing
  },
  summaryCardValue: {
    fontSize: 16, // Slightly smaller
    fontWeight: "bold",
    color: "#0B1446",
    flexWrap: "nowrap", // Prevent text wrapping
  },
  filterInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },

  ordersContainer: {
    flex: 1, // This makes it take remaining space
  },

  filterInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1976d2",
  },
  clearFiltersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#1976d2",
    borderRadius: 4,
  },
  clearFiltersText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  ordersList: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0B1446",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabelsmall: {
    fontSize: 12,
    color: "#666",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0B1446",
  },
  profitLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  changeStatusBtn: {
    backgroundColor: "#0B1446",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  changeStatusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  paginationButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
  },
  paginationButtonDisabled: {
    backgroundColor: "#f9f9f9",
  },
  paginationText: {
    fontSize: 14,
    color: "#666",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%", // Reduced from "80%"
    width: "100%",
  },

  statsModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterContent: {
    padding: 16,
    paddingBottom: 30, // Add extra padding at bottom
    maxHeight: "100%",
  },
  statsContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#0B1446",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0B1446",
  },
  numberPicker: {
    marginTop: 8,
  },
  numberButtons: {
    flexDirection: "row",
    gap: 8,
  },
  numberButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
  },
  numberButtonActive: {
    backgroundColor: "#0B1446",
  },
  numberButtonText: {
    color: "#666",
  },
  numberButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#0B1446",
  },
  filterChipText: {
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20, // Add margin bottom
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  resetButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  applyButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#0B1446",
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  // Order Details Styles
  detailsContent: {
    padding: 16,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailsOrderNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
  },
  detailsStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  detailsStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  infoGrid: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
  },
  orderItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0B1446",
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemQty: {
    fontSize: 12,
    color: "#666",
  },
  itemCost: {
    fontSize: 12,
    color: "#F44336",
  },
  summaryGrid: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0B1446",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0B1446",
  },
  profitValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  // Stats Modal
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0B1446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  statName: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  statCount: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
  summaryCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between", // Distribute space evenly
    paddingHorizontal: 12,
    marginBottom: 12,
  },
});

export default OrdersMobile;
