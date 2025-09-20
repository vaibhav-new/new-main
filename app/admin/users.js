import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Users, UserCheck, UserX, Shield, CreditCard as Edit, Trash2, Plus, Search, Filter } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState({
    user_type: '',
    is_verified: false,
    points: 0
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, user_type, city, state, is_verified, points, created_at, last_login_at')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setUsers(data || []);
      setFilteredUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, selectedFilter, searchQuery]);

  const applyFilters = () => {
    let filtered = [...users];

    // Filter by user type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === selectedFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditData({
      user_type: user.user_type,
      is_verified: user.is_verified,
      points: user.points || 0
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          user_type: editData.user_type,
          is_verified: editData.is_verified,
          points: parseInt(String(editData.points), 10) || 0, // Ensure points is a number
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      Alert.alert('Success', 'User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      await load();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.full_name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.admin.deleteUser(user.id);
              if (error) throw error;
              
              Alert.alert('Success', 'User deleted successfully');
              await load();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin': return '#10B981';
      case 'tender': return '#F59E0B';
      default: return '#1E40AF';
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'admin': return <Shield size={16} color="#10B981" />;
      case 'tender': return <Users size={16} color="#F59E0B" />;
      default: return <Users size={16} color="#1E40AF" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const userTypeFilters = [
    { id: 'all', label: 'All Users', count: users.length },
    { id: 'user', label: 'Citizens', count: users.filter(u => u.user_type === 'user').length },
    { id: 'tender', label: 'Contractors', count: users.filter(u => u.user_type === 'tender').length },
    { id: 'admin', label: 'Admins', count: users.filter(u => u.user_type === 'admin').length }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>{filteredUsers.length} users</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {userTypeFilters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.id && styles.filterTabActive
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === filter.id && styles.filterTabTextActive
                ]}>
                  {filter.label}
                </Text>
                <View style={styles.filterTabBadge}>
                  <Text style={styles.filterTabBadgeText}>{filter.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1E40AF" size="large" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView style={styles.usersList}>
          {filteredUsers.map(user => (
            <View key={user.id} style={styles.userCard}>
              {/* User Header */}
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>
                      {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}
                    </Text>
                    {user.is_verified && (
                      <UserCheck size={16} color="#10B981" />
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={styles.userTypeContainer}>
                      {getUserTypeIcon(user.user_type)}
                      <Text style={[styles.userType, { color: getUserTypeColor(user.user_type) }]}>
                        {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                      </Text>
                    </View>
                    {user.points > 0 && (
                      <Text style={styles.userPoints}>{user.points} points</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditUser(user)}
                  >
                    <Edit size={16} color="#1E40AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(user)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Details */}
              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    {user.city || user.state ? `${user.city || ''}${user.city && user.state ? ', ' : ''}${user.state || ''}` : 'Not provided'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Login:</Text>
                  <Text style={styles.detailValue}>{formatDate(user.last_login_at)}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit User Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User</Text>
            {selectedUser && (
              <>
                <Text style={styles.modalSubtitle}>
                  {selectedUser.full_name || selectedUser.email}
                </Text>

                {/* User Type */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>User Type</Text>
                  <View style={styles.radioGroup}>
                    {['user', 'tender', 'admin'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.radioOption,
                          editData.user_type === type && styles.radioOptionActive
                        ]}
                        onPress={() =>
                          setEditData({ ...editData, user_type: type })
                        }
                      >
                        <Text
                          style={[
                            styles.radioOptionText,
                            editData.user_type === type && styles.radioOptionTextActive
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Verification Status */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      editData.is_verified && styles.toggleButtonActive
                    ]}
                    onPress={() => setEditData({...editData, is_verified: !editData.is_verified})}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      editData.is_verified && styles.toggleButtonTextActive
                    ]}>
                      {editData.is_verified ? 'Verified' : 'Unverified'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Points */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Points</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(editData.points)}
                    onChangeText={(text) => setEditData({...editData, points: text})}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitButton}
                    onPress={handleUpdateUser}
                  >
                    <Text style={styles.modalSubmitText}>Update User</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterTabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userType: {
    fontSize: 14,
    fontWeight: '600',
  },
  userPoints: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  radioOptionActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  radioOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  radioOptionTextActive: {
    color: '#FFFFFF',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});