import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

type Metrics = {
  totalSales: number;
  currentMonthSales: number;
  monthlyTarget: number;
  productsCount: number;
  ordersCount: number;
  customersCount: number;
};

type Order = {
  sale_id: number;
  order_number: string;
  customer_name: string;
  total_price: number;
  payment_type: string;
  sale_date: string;
  status?: string;
};

const DashboardMobile = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    currentMonthSales: 0,
    monthlyTarget: 125000,
    productsCount: 0,
    ordersCount: 0,
    customersCount: 0,
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [salesData, setSalesData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });

  const router = useRouter();

  const formatCurrency = (amount: number | string) =>
    `Ksh.${(Number(amount) || 0)
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const fetchDashboardData = async () => {
    try {
      const [salesRes, ordersRes] = await Promise.all([
        fetch("http://192.168.1.66:5000/sales-data"),
        fetch("http://192.168.1.66:5000/get-orders"),
      ]);

      const salesJson = await salesRes.json();
      const ordersJson = await ordersRes.json();

      if (salesJson.metrics) {
        setMetrics({
          totalSales: salesJson.metrics.total_sales || 0,
          currentMonthSales: salesJson.metrics.current_month_sales || 0,
          monthlyTarget: salesJson.metrics.monthly_target || 125000,
          productsCount: salesJson.metrics.products_count || 0,
          ordersCount: salesJson.metrics.orders_count || 0,
          customersCount: salesJson.metrics.customers_count || 0,
        });
      }

      if (salesJson.labels && salesJson.sales) {
        setSalesData({
          labels: salesJson.labels.slice(-7),
          datasets: [{ data: salesJson.sales.slice(-7) }],
        });
      }

      if (ordersJson.orders) {
        const ordersMap = new Map<number, Order>();

        ordersJson.orders.forEach((order: any) => {
          if (!ordersMap.has(order.sale_id)) {
            ordersMap.set(order.sale_id, {
              sale_id: order.sale_id,
              order_number: order.order_number,
              customer_name: order.customer_name || "Walk-in",
              total_price: Number(order.total_price) || 0,
              payment_type: order.payment_type || "Unknown",
              sale_date: order.sale_date,
              status: order.status,
            });
          }
        });

        setRecentOrders(
          Array.from(ordersMap.values())
            .sort(
              (a, b) =>
                new Date(b.sale_date).getTime() -
                new Date(a.sale_date).getTime(),
            )
            .slice(0, 5),
        );
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F5A100" />
      </View>
    );
  }

  const progressPercentage = Math.min(
    (metrics.currentMonthSales / metrics.monthlyTarget) * 100,
    100,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Overview</Text>
          <TouchableOpacity onPress={fetchDashboardData}>
            <Icon name="refresh" size={24} color="#0B1446" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <StatCard
              icon="cash"
              label="Total Sales"
              value={formatCurrency(metrics.totalSales)}
            />
            <StatCard
              icon="package-variant"
              label="Products"
              value={metrics.productsCount}
            />
          </View>

          <View style={styles.statRow}>
            <StatCard icon="cart" label="Orders" value={metrics.ordersCount} />
            <StatCard
              icon="account-group"
              label="Customers"
              value={metrics.customersCount}
            />
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Sales Trend (Last 7 Days)</Text>
          {salesData.labels.length > 0 ? (
            <LineChart
              data={salesData}
              width={screenWidth - 32}
              height={220}
              bezier
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (o = 1) => `rgba(245,161,0,${o})`,
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#0B1446",
                },
              }}
              style={{ borderRadius: 16 }}
              formatYLabel={(v: string) => `Ksh.${Number(v).toLocaleString()}`}
            />
          ) : (
            <Text style={styles.noData}>No sales data available</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: any;
}) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={24} color="#F5A100" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const getStatusColor = (status?: string) => {
  if (!status) return "#9E9E9E";
  switch (status.toLowerCase()) {
    case "completed":
      return "darkgreen";
    case "voided":
      return "#F44336";
    case "refunded":
      return "#FF9800";
    default:
      return "#9E9E9E";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#0B1446" },
  statsContainer: { padding: 16 },
  statRow: { flexDirection: "row", marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
    marginTop: 8,
  },
  statLabel: { fontSize: 12, color: "#606060" },
  chartSection: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0B1446",
    marginBottom: 12,
  },
  noData: { textAlign: "center", color: "#999", padding: 20 },
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },

  scrollContent: {
    paddingTop: 8, // 👈 pushes dashboard down slightly
    paddingBottom: 16,
  },
});

export default DashboardMobile;
