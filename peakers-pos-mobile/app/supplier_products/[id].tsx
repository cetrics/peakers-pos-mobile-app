import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const API = "http://192.168.1.66:5000";

type SupplierProduct = {
  supplier_product_id: number;
  product_name: string;
  price: number;
  stock_supplied: number;
  supply_date: string;
  // ... other fields
};

const SupplierProductsMobile = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<SupplierProduct | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchSupplierData();
      fetchProducts();
    }, [id]),
  );

  const fetchSupplierData = async () => {
    try {
      // Add type to axios.get
      const response = await axios.get<{ supplier_name: string }>(
        `${API}/api/v1/supplier/${id}`,
      );
      setSupplierName(response.data.supplier_name);
    } catch (error) {
      Alert.alert("Error", "Failed to load supplier data");
    }
  };

  const refreshProducts = () => {
    fetchProducts();
  };

  const fetchProducts = async () => {
    try {
      // Add SupplierProduct[] type to axios.get
      const response = await axios.get<SupplierProduct[]>(
        `${API}/supplier-products/${id}`,
      );
      setProducts(response.data);
    } catch (error) {
      Alert.alert("Error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const renderProductCard = ({ item }: { item: SupplierProduct }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedProduct(item);
        setEditModalVisible(true);
      }}
    >
      <Text style={styles.productName}>{item.product_name}</Text>
      <View style={styles.detailRow}>
        <Icon name="currency-usd" size={16} color="#666" />
        <Text style={styles.detailText}>Price: KSh {item.price}</Text>
      </View>
      <View style={styles.detailRow}>
        <Icon name="package-variant" size={16} color="#666" />
        <Text style={styles.detailText}>Stock: {item.stock_supplied}</Text>
      </View>
      <View style={styles.detailRow}>
        <Icon name="calendar" size={16} color="#666" />
        <Text style={styles.detailText}>
          {new Date(item.supply_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.paymentButton]}
          onPress={(e) => {
            e.stopPropagation();
            router.push({
              pathname: "./payment",
              params: {
                productId: item.supplier_product_id.toString(),
                productName: item.product_name,
                price: item.price.toString(),
                supplierId: id.toString(),
              },
            });
          }}
        >
          <Icon name="credit-card" size={16} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.historyButton]}
          onPress={(e) => {
            e.stopPropagation();
            router.push({
              pathname: "./history",
              params: {
                productId: item.supplier_product_id.toString(),
                productName: item.product_name,
                supplierId: id.toString(),
              },
            });
          }}
        >
          <Icon name="history" size={16} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B1446" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      {/* Header */}
      <View style={styles.header}>
        {/* Back Arrow */}
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#0B1446" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Products: {supplierName || "Supplier"}</Text>

        {/* Add Button (only one) */}
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "./add",
              params: { supplierId: id.toString() },
            });
          }}
        >
          <Icon name="plus-circle" size={24} color="#0B1446" />
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.supplier_product_id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No products found</Text>
          </View>
        }
      />

      {/* Modals will go here */}
      {/* AddProductModal, PaymentModal, HistoryModal, EditProductModal */}
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
    textAlign: "center",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  listContainer: {
    padding: 12,
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
  productName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  paymentButton: {
    backgroundColor: "#4CAF50",
  },
  historyButton: {
    backgroundColor: "#2196F3",
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
  // Modal styles (for future use)
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
  formContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#0B1446",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SupplierProductsMobile;
