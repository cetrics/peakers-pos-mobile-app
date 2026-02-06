import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";

const API = "http://192.168.1.66:5000";

type Payment = {
  payment_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string | null;
};

type PaymentHistoryResponse = {
  payments: Payment[];
  total_paid: number;
  balance_remaining: number;
  supplier_info: {
    supplier_name: string;
  };
};

const PaymentHistoryScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId: string;
    productName: string;
    supplierId: string;
  }>();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get<PaymentHistoryResponse>(
        `${API}/supplier-payments/${params.supplierId}/${params.productId}`,
      );

      const data = response.data;
      setPayments(data.payments || []);
      setTotalPaid(data.total_paid || 0);
      setRemainingAmount(data.balance_remaining || 0);
      setSupplierName(data.supplier_info?.supplier_name || "");
    } catch (error) {
      Alert.alert("Error", "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentId}>Payment #{item.payment_id}</Text>
        <Text style={styles.paymentDate}>
          {new Date(item.payment_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Icon name="currency-usd" size={16} color="#666" />
          <Text style={styles.amountText}>KSh {item.amount}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon
            name={item.payment_method === "Mpesa" ? "cellphone" : "cash"}
            size={16}
            color="#666"
          />
          <Text style={styles.methodText}>{item.payment_method}</Text>
        </View>

        {item.reference && (
          <View style={styles.detailRow}>
            <Icon name="receipt" size={16} color="#666" />
            <Text style={styles.referenceText}>Ref: {item.reference}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d8085" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#0B1446" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          History: {params.productName}
        </Text>
        <TouchableOpacity onPress={fetchPayments}>
          <Icon name="refresh" size={24} color="#3d8085" />
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Supplier:</Text>
          <Text style={styles.summaryValue}>{supplierName}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Paid:</Text>
          <Text style={[styles.summaryValue, styles.totalPaid]}>
            KSh {totalPaid}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Balance:</Text>
          <Text
            style={[
              styles.summaryValue,
              remainingAmount > 0 ? styles.balanceRed : styles.balanceGreen,
            ]}
          >
            KSh {remainingAmount}
          </Text>
        </View>
      </View>

      {/* Payments List */}
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.payment_id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No payment history found</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchPayments}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#0B1446",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  summaryContainer: {
    backgroundColor: "#fff",
    margin: 12,
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalPaid: {
    color: "#2e7d32",
  },
  balanceRed: {
    color: "#F44336",
  },
  balanceGreen: {
    color: "#4CAF50",
  },
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  paymentId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  paymentDate: {
    fontSize: 12,
    color: "#666",
  },
  paymentDetails: {
    // padding: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  amountText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  methodText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  referenceText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
});

export default PaymentHistoryScreen;
