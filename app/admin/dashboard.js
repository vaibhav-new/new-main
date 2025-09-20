import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChartBar as BarChart3, Users, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, MapPin, Filter, Search, Settings, LogOut, MessageSquare, FileText, DollarSign, Calendar, Eye, CreditCard as Edit, Trash2, Plus, Send, UserCheck, Building, Activity, TrendingUp } from 'lucide-react-native';
import { 
  getIssues, 
  getTenders, 
  getAdminDashboardStats, 
  updateIssue, 
  createTenderFromIssue,
  getCurrentUser,
  getUserProfile,
  signOut
} from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedFilters, setSelectedFilters] = useState({
    category: 'all',
    status: 'all',
    priority: 'all',
    location: 'all',
    department: 'all'
  });
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState({});
  const [issues, setIssues] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    department: '',
    assignedTo: '',
    priority: '',
    estimatedDate: ''
  });
  const [tenderData, setTenderData] = useState({
    title: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    requirements: '',
    location: '',
    category: ''
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'issues', label: 'Issue Management', icon: AlertTriangle },
    { id: 'tenders', label: 'Tenders', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const departments = [
    'Public Works', 'Parks & Recreation', 'Environment', 'Public Safety', 
    'Administration', 'Transportation', 'Utilities', 'Planning'
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'roads', label: 'Roads', color: '#EF4444' },
    { id: 'utilities', label: 'Utilities', color: '#F59E0B' },
    { id: 'environment', label: 'Environment', color: '#10B981' },
    { id: 'safety', label: 'Safety', color: '#8B5CF6' },
    { id: 'parks', label: 'Parks', color: '#06B6D4' },
    { id: 'other', label: 'Other', color: '#6B7280' }
  ];

  // Updated 3-phase status system
  const statuses = [
    { id: 'all', label: 'All Status' },
    { id: 'pending', label: 'Reported', color: '#F59E0B', description: 'User has raised the issue' },
    { id: 'in_progress', label: 'In Progress', color: '#1E40AF', description: 'Contractor has accepted and started work' },
    { id: 'resolved', label: 'Resolved', color: '#10B981', description: 'Issue has been completed and closed' }
  ];

  const priorities = [
    { id: 'all', label: 'All Priorities' },
    { id: 'low', label: 'Low', color: '#10B981' },
    { id: 'medium', label: 'Medium', color: '#F59E0B' },
    { id: 'high', label: 'High', color: '#EF4444' },
    { id: 'urgent', label: 'Urgent', color: '#DC2626' }
  ];

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (user && profile) {
      loadDashboardData();
    }
  }, [user, profile, selectedFilters]);

  useEffect(() => {
    applyFilters();
  }, [issues, selectedFilters]);

  const checkAdminAccess = async () => {
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      if (userError || !currentUser) {
        Alert.alert('Access Denied', 'Please sign in to access admin dashboard');
        router.replace('/auth');
        return;
      }

      const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
      if (profileError || !profileData || profileData.user_type !== 'admin') {
        Alert.alert('Access Denied', 'You do not have admin privileges');
        router.replace('/(tabs)');
        return;
      }

      setUser(currentUser);
      setProfile(profileData);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.replace('/auth');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResult, issuesResult, tendersResult] = await Promise.all([
        getAdminDashboardStats(),
        getIssues(),
        getTenders('all')
      ]);

      if (statsResult.data) setDashboardStats(statsResult.data);
      if (issuesResult.data) setIssues(issuesResult.data);
      if (tendersResult.data) setTenders(tendersResult.data);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...issues];

    if (selectedFilters.category !== 'all') {
      filtered = filtered.filter(issue => issue.category === selectedFilters.category);
    }

    if (selectedFilters.status !== 'all') {
      filtered = filtered.filter(issue => issue.status === selectedFilters.status);
    }

    if (selectedFilters.priority !== 'all') {
      filtered = filtered.filter(issue => issue.priority === selectedFilters.priority);
    }

    if (selectedFilters.location !== 'all') {
      filtered = filtered.filter(issue => 
        issue.area === selectedFilters.location || 
        issue.ward === selectedFilters.location
      );
    }

    if (selectedFilters.department !== 'all') {
      filtered = filtered.filter(issue => issue.assigned_department === selectedFilters.department);
    }

    setFilteredIssues(filtered);
  };

  const handleAssignIssue = (issue) => {
    setSelectedIssue(issue);
    setAssignmentData({
      department: issue.assigned_department || '',
      assignedTo: issue.assigned_to || '',
      priority: issue.priority,
      estimatedDate: ''
    });
    setShowAssignModal(true);
  };

  const submitAssignment = async () => {
    if (!selectedIssue || !assignmentData.department) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    try {
      const updates = {
        assigned_department: assignmentData.department,
        assigned_to: assignmentData.assignedTo,
        priority: assignmentData.priority,
        status: 'in_progress', // Move to In Progress phase
        estimated_resolution_date: assignmentData.estimatedDate || null
      };

      const { error } = await updateIssue(selectedIssue.id, updates);
      if (error) throw error;

      Alert.alert('Success', 'Issue assigned and moved to In Progress');
      setShowAssignModal(false);
      setSelectedIssue(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error assigning issue:', error);
      Alert.alert('Error', 'Failed to assign issue');
    }
  };

  const handleCreateTender = (issue) => {
    setSelectedIssue(issue);
    setTenderData({
      title: `Tender for: ${issue.title}`,
      description: issue.description,
      budgetMin: '',
      budgetMax: '',
      deadline: '',
      requirements: '',
      location: issue.location_name || issue.address || '',
      category: issue.category
    });
    setShowTenderModal(true);
  };

  const submitTender = async () => {
    if (!selectedIssue || !tenderData.title || !tenderData.budgetMin || !tenderData.deadline) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Budget Min, Deadline)');
      return;
    }

    try {
      const tender = {
        title: tenderData.title,
        description: tenderData.description,
        category: tenderData.category,
        location: tenderData.location,
        area: selectedIssue.area,
        ward: selectedIssue.ward,
        estimated_budget_min: parseFloat(tenderData.budgetMin),
        estimated_budget_max: parseFloat(tenderData.budgetMax) || parseFloat(tenderData.budgetMin),
        deadline_date: tenderData.deadline,
        submission_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        requirements: tenderData.requirements.split('\n').filter(r => r.trim()),
        priority: selectedIssue.priority,
        status: 'available'
      };

      const { error } = await createTenderFromIssue(selectedIssue.id, tender);
      if (error) throw error;

      Alert.alert('Success', 'Tender created successfully and issue moved to In Progress');
      setShowTenderModal(false);
      setSelectedIssue(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating tender:', error);
      Alert.alert('Error', 'Failed to create tender: ' + error.message);
    }
  };

  const handleUpdateStatus = async (issueId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.actual_resolution_date = new Date().toISOString();
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await updateIssue(issueId, updates);
      if (error) throw error;

      const statusLabels = {
        'pending': 'Reported',
        'in_progress': 'In Progress', 
        'resolved': 'Resolved'
      };

      Alert.alert('Success', `Issue status updated to ${statusLabels[newStatus]}`);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusObj = statuses.find(s => s.id === status);
    return statusObj?.color || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find(p => p.id === priority);
    return priorityObj?.color || '#6B7280';
  };

  const getCategoryColor = (category) => {
    const categoryObj = categories.find(c => c.id === category);
    return categoryObj?.color || '#6B7280';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPhaseProgress = (status) => {
    switch (status) {
      case 'pending': return 1;
      case 'in_progress': return 2;
      case 'resolved': return 3;
      default: return 1;
    }
  };

  const renderPhaseIndicator = (currentStatus) => {
    const currentPhase = getPhaseProgress(currentStatus);
    
    return (
      <View style={styles.phaseIndicator}>
        <View style={styles.phaseStep}>
          <View style={[
            styles.phaseCircle,
            currentPhase >= 1 && styles.phaseCircleActive,
            { backgroundColor: currentPhase >= 1 ? '#F59E0B' : '#E5E7EB' }
          ]}>
            <Text style={[styles.phaseNumber, currentPhase >= 1 && styles.phaseNumberActive]}>1</Text>
          </View>
          <Text style={styles.phaseLabel}>Reported</Text>
        </View>
        
        <View style={[styles.phaseLine, currentPhase >= 2 && styles.phaseLineActive]} />
        
        <View style={styles.phaseStep}>
          <View style={[
            styles.phaseCircle,
            currentPhase >= 2 && styles.phaseCircleActive,
            { backgroundColor: currentPhase >= 2 ? '#1E40AF' : '#E5E7EB' }
          ]}>
            <Text style={[styles.phaseNumber, currentPhase >= 2 && styles.phaseNumberActive]}>2</Text>
          </View>
          <Text style={styles.phaseLabel}>In Progress</Text>
        </View>
        
        <View style={[styles.phaseLine, currentPhase >= 3 && styles.phaseLineActive]} />
        
        <View style={styles.phaseStep}>
          <View style={[
            styles.phaseCircle,
            currentPhase >= 3 && styles.phaseCircleActive,
            { backgroundColor: currentPhase >= 3 ? '#10B981' : '#E5E7EB' }
          ]}>
            <Text style={[styles.phaseNumber, currentPhase >= 3 && styles.phaseNumberActive]}>3</Text>
          </View>
          <Text style={styles.phaseLabel}>Resolved</Text>
        </View>
      </View>
    );
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <AlertTriangle size={24} color="#EF4444" />
          <Text style={styles.statNumber}>{dashboardStats.total_issues || 0}</Text>
          <Text style={styles.statLabel}>Total Issues</Text>
          <Text style={styles.statTrend}>+{dashboardStats.recent_issues || 0} this week</Text>
        </View>

        <View style={styles.statCard}>
          <Clock size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{dashboardStats.pending_issues || 0}</Text>
          <Text style={styles.statLabel}>Reported</Text>
          <Text style={styles.statTrend}>Awaiting assignment</Text>
        </View>

        <View style={styles.statCard}>
          <Activity size={24} color="#1E40AF" />
          <Text style={styles.statNumber}>{dashboardStats.in_progress_issues || 0}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
          <Text style={styles.statTrend}>Being worked on</Text>
        </View>

        <View style={styles.statCard}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={styles.statNumber}>{dashboardStats.resolved_issues || 0}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
          <Text style={styles.statTrend}>{dashboardStats.resolution_rate || 0}% rate</Text>
        </View>
      </View>

      {/* Recent Issues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Issues</Text>
          <TouchableOpacity onPress={() => setSelectedTab('issues')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {filteredIssues.slice(0, 5).map(issue => (
          <TouchableOpacity key={issue.id} style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(issue.priority) }]} />
              <Text style={styles.issueTitle} numberOfLines={1}>{issue.title}</Text>
              <Text style={[styles.issueStatus, { color: getStatusColor(issue.status) }]}>
                {issue.status === 'pending' ? 'Reported' : 
                 issue.status === 'in_progress' ? 'In Progress' : 'Resolved'}
              </Text>
            </View>
            <Text style={styles.issueLocation}>{issue.location_name || issue.address}</Text>
            <Text style={styles.issueDate}>{formatDate(issue.created_at)}</Text>
            {renderPhaseIndicator(issue.status)}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderIssues = () => (
    <View style={styles.tabContent}>
      {/* Phase Overview */}
      <View style={styles.phaseOverview}>
        <Text style={styles.sectionTitle}>3-Phase Issue Management</Text>
        <View style={styles.phaseCards}>
          <View style={[styles.phaseCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.phaseCardNumber}>{issues.filter(i => i.status === 'pending').length}</Text>
            <Text style={styles.phaseCardTitle}>Reported</Text>
            <Text style={styles.phaseCardDesc}>User has raised the issue</Text>
          </View>
          <View style={[styles.phaseCard, { borderLeftColor: '#1E40AF' }]}>
            <Text style={styles.phaseCardNumber}>{issues.filter(i => i.status === 'in_progress').length}</Text>
            <Text style={styles.phaseCardTitle}>In Progress</Text>
            <Text style={styles.phaseCardDesc}>Contractor working on it</Text>
          </View>
          <View style={[styles.phaseCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.phaseCardNumber}>{issues.filter(i => i.status === 'resolved').length}</Text>
            <Text style={styles.phaseCardTitle}>Resolved</Text>
            <Text style={styles.phaseCardDesc}>Issue completed & closed</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Category Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterButtons}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterButton,
                      selectedFilters.category === category.id && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedFilters({...selectedFilters, category: category.id})}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedFilters.category === category.id && styles.filterButtonTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Phase</Text>
              <View style={styles.filterButtons}>
                {statuses.map(status => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.filterButton,
                      selectedFilters.status === status.id && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedFilters({...selectedFilters, status: status.id})}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedFilters.status === status.id && styles.filterButtonTextActive
                    ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Priority</Text>
              <View style={styles.filterButtons}>
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority.id}
                    style={[
                      styles.filterButton,
                      selectedFilters.priority === priority.id && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedFilters({...selectedFilters, priority: priority.id})}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedFilters.priority === priority.id && styles.filterButtonTextActive
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Issues List */}
      <ScrollView style={styles.issuesList}>
        {filteredIssues.map(issue => (
          <View key={issue.id} style={styles.detailedIssueCard}>
            {/* Issue Header */}
            <View style={styles.detailedIssueHeader}>
              <View style={styles.issueMetadata}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(issue.category) + '20' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(issue.category) }]}>
                    {issue.category}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(issue.priority) }]}>
                  <Text style={styles.priorityText}>{issue.priority.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(issue.status) }]}>
                    {issue.status === 'pending' ? 'REPORTED' : 
                     issue.status === 'in_progress' ? 'IN PROGRESS' : 'RESOLVED'}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueId}>#{issue.id.slice(-8)}</Text>
            </View>

            {/* Issue Content */}
            <Text style={styles.detailedIssueTitle}>{issue.title}</Text>
            <Text style={styles.detailedIssueDescription} numberOfLines={2}>
              {issue.description}
            </Text>

            {/* Phase Progress */}
            {renderPhaseIndicator(issue.status)}

            {/* Issue Details */}
            <View style={styles.issueDetails}>
              <View style={styles.detailRow}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.detailText}>{issue.location_name || issue.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Users size={14} color="#6B7280" />
                <Text style={styles.detailText}>
                  {issue.profiles?.full_name || issue.profiles?.first_name || 'Anonymous'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Calendar size={14} color="#6B7280" />
                <Text style={styles.detailText}>{formatDate(issue.created_at)}</Text>
              </View>
            </View>

            {/* Assignment Info */}
            {issue.assigned_department && (
              <View style={styles.assignmentInfo}>
                <Building size={14} color="#10B981" />
                <Text style={styles.assignmentText}>
                  Assigned to: {issue.assigned_department}
                  {issue.assigned_to && ` - ${issue.assigned_to}`}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.issueActions}>
              {issue.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={() => handleAssignIssue(issue)}
                  >
                    <UserCheck size={14} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Assign & Start</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.tenderButton]}
                    onPress={() => handleCreateTender(issue)}
                  >
                    <FileText size={14} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Create Tender</Text>
                  </TouchableOpacity>
                </>
              )}

              {issue.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => handleUpdateStatus(issue.id, 'resolved')}
                >
                  <CheckCircle size={14} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/admin/issue-${issue.id}`)}
              >
                <Eye size={14} color="#374151" />
                <Text style={[styles.actionButtonText, { color: '#374151' }]}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderTenders = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Tenders</Text>
        <Text style={styles.sectionSubtitle}>{tenders.length} total tenders</Text>
      </View>

      <ScrollView style={styles.tendersList}>
        {tenders.map(tender => (
          <View key={tender.id} style={styles.tenderCard}>
            <View style={styles.tenderHeader}>
              <Text style={styles.tenderTitle}>{tender.title}</Text>
              <View style={[styles.tenderStatus, { backgroundColor: getStatusColor(tender.status) + '20' }]}>
                <Text style={[styles.tenderStatusText, { color: getStatusColor(tender.status) }]}>
                  {tender.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.tenderDescription} numberOfLines={2}>
              {tender.description}
            </Text>

            <View style={styles.tenderDetails}>
              <View style={styles.tenderDetailRow}>
                <DollarSign size={14} color="#10B981" />
                <Text style={styles.tenderDetailText}>
                  ${tender.estimated_budget_min?.toLocaleString()} - ${tender.estimated_budget_max?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.tenderDetailRow}>
                <Calendar size={14} color="#F59E0B" />
                <Text style={styles.tenderDetailText}>
                  Deadline: {formatDate(tender.deadline_date)}
                </Text>
              </View>
              <View style={styles.tenderDetailRow}>
                <FileText size={14} color="#8B5CF6" />
                <Text style={styles.tenderDetailText}>
                  {tender.bids?.length || 0} bids received
                </Text>
              </View>
            </View>

            {/* Bids Summary */}
            {tender.bids && tender.bids.length > 0 && (
              <View style={styles.bidsSection}>
                <Text style={styles.bidsTitle}>Recent Bids:</Text>
                {tender.bids.slice(0, 3).map(bid => (
                  <View key={bid.id} style={styles.bidItem}>
                    <Text style={styles.bidContractor}>
                      {bid.profiles?.full_name || 'Anonymous'}
                    </Text>
                    <Text style={styles.bidAmount}>${bid.amount?.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>System Settings</Text>
      
      {/* System Configuration */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>System Configuration</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Settings size={20} color="#1E40AF" />
            <View>
              <Text style={styles.settingTitle}>Issue Management Settings</Text>
              <Text style={styles.settingDescription}>Configure issue categories, priorities, and workflows</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <FileText size={20} color="#8B5CF6" />
            <View>
              <Text style={styles.settingTitle}>Tender Management</Text>
              <Text style={styles.settingDescription}>Configure tender categories, approval workflows</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Users size={20} color="#10B981" />
            <View>
              <Text style={styles.settingTitle}>User Management</Text>
              <Text style={styles.settingDescription}>Manage user roles, permissions, and verification</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MessageSquare size={20} color="#F59E0B" />
            <View>
              <Text style={styles.settingTitle}>Communication Settings</Text>
              <Text style={styles.settingDescription}>Configure notifications, email templates</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Data Management */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <BarChart3 size={20} color="#EF4444" />
            <View>
              <Text style={styles.settingTitle}>Analytics Configuration</Text>
              <Text style={styles.settingDescription}>Set up reporting periods and metrics</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MapPin size={20} color="#06B6D4" />
            <View>
              <Text style={styles.settingTitle}>Location Management</Text>
              <Text style={styles.settingDescription}>Manage areas, wards, and geographic boundaries</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Building size={20} color="#8B5CF6" />
            <View>
              <Text style={styles.settingTitle}>Department Management</Text>
              <Text style={styles.settingDescription}>Configure departments and their responsibilities</Text>
            </View>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* System Health */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>System Health</Text>
        
        <View style={styles.healthMetrics}>
          <View style={styles.healthMetric}>
            <Text style={styles.healthValue}>99.9%</Text>
            <Text style={styles.healthLabel}>Uptime</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthValue}>1.2s</Text>
            <Text style={styles.healthLabel}>Avg Response</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthValue}>{issues.length}</Text>
            <Text style={styles.healthLabel}>Total Records</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthValue}>Active</Text>
            <Text style={styles.healthLabel}>Database</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#1E40AF" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {profile?.full_name || profile?.first_name || 'Admin'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, selectedTab === tab.id && styles.tabActive]}
                  onPress={() => setSelectedTab(tab.id)}
                >
                  <IconComponent 
                    size={16} 
                    color={selectedTab === tab.id ? '#1E40AF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.tabText,
                    selectedTab === tab.id && styles.tabTextActive
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'issues' && renderIssues()}
        {selectedTab === 'tenders' && renderTenders()}
        {selectedTab === 'users' && (
          <View style={styles.tabContent}>
            <TouchableOpacity 
              style={styles.navigationCard}
              onPress={() => router.push('/admin/users')}
            >
              <Users size={24} color="#10B981" />
              <Text style={styles.navigationTitle}>User Management</Text>
              <Text style={styles.navigationDescription}>Manage users, roles, and permissions</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedTab === 'analytics' && (
          <View style={styles.tabContent}>
            <TouchableOpacity 
              style={styles.navigationCard}
              onPress={() => router.push('/admin/analytics')}
            >
              <TrendingUp size={24} color="#8B5CF6" />
              <Text style={styles.navigationTitle}>Analytics Dashboard</Text>
              <Text style={styles.navigationDescription}>View detailed analytics and reports</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedTab === 'feedback' && (
          <View style={styles.tabContent}>
            <TouchableOpacity 
              style={styles.navigationCard}
              onPress={() => router.push('/admin/feedback-management')}
            >
              <MessageSquare size={24} color="#F59E0B" />
              <Text style={styles.navigationTitle}>Feedback Management</Text>
              <Text style={styles.navigationDescription}>Handle user feedback and responses</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedTab === 'settings' && renderSettings()}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Issue & Move to In Progress</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Department *</Text>
              <View style={styles.pickerContainer}>
                {departments.map(dept => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.pickerOption,
                      assignmentData.department === dept && styles.pickerOptionActive
                    ]}
                    onPress={() => setAssignmentData({...assignmentData, department: dept})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      assignmentData.department === dept && styles.pickerOptionTextActive
                    ]}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assigned To</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter person/team name"
                value={assignmentData.assignedTo}
                onChangeText={(text) => setAssignmentData({...assignmentData, assignedTo: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estimated Completion Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                value={assignmentData.estimatedDate}
                onChangeText={(text) => setAssignmentData({...assignmentData, estimatedDate: text})}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={submitAssignment}
              >
                <Text style={styles.modalSubmitText}>Assign & Start Work</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tender Creation Modal */}
      <Modal visible={showTenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Tender from Issue</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Tender title"
                  value={tenderData.title}
                  onChangeText={(text) => setTenderData({...tenderData, title: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Detailed description of work required"
                  value={tenderData.description}
                  onChangeText={(text) => setTenderData({...tenderData, description: text})}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Work location"
                  value={tenderData.location}
                  onChangeText={(text) => setTenderData({...tenderData, location: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Budget Range *</Text>
                <View style={styles.budgetRow}>
                  <TextInput
                    style={[styles.textInput, styles.budgetInput]}
                    placeholder="Min ($)"
                    value={tenderData.budgetMin}
                    onChangeText={(text) => setTenderData({...tenderData, budgetMin: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.textInput, styles.budgetInput]}
                    placeholder="Max ($)"
                    value={tenderData.budgetMax}
                    onChangeText={(text) => setTenderData({...tenderData, budgetMax: text})}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deadline *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  value={tenderData.deadline}
                  onChangeText={(text) => setTenderData({...tenderData, deadline: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Requirements</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="List requirements (one per line)"
                  value={tenderData.requirements}
                  onChangeText={(text) => setTenderData({...tenderData, requirements: text})}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowTenderModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  onPress={submitTender}
                >
                  <Text style={styles.modalSubmitText}>Create Tender</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  // Phase Management Styles
  phaseOverview: {
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
  phaseCards: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phaseCardNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  phaseCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  phaseCardDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  phaseStep: {
    alignItems: 'center',
    flex: 1,
  },
  phaseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseCircleActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  phaseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  phaseNumberActive: {
    color: '#FFFFFF',
  },
  phaseLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  phaseLine: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    flex: 0.5,
  },
  phaseLineActive: {
    backgroundColor: '#1E40AF',
  },
  issueCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  issueTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  issueStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  issueLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  issueDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterRow: {
    gap: 20,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  issuesList: {
    flex: 1,
  },
  detailedIssueCard: {
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
  detailedIssueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issueMetadata: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  detailedIssueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailedIssueDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  issueDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  assignmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  assignmentText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  issueActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  assignButton: {
    backgroundColor: '#1E40AF',
  },
  tenderButton: {
    backgroundColor: '#8B5CF6',
  },
  resolveButton: {
    backgroundColor: '#10B981',
  },
  viewButton: {
    backgroundColor: '#E5E7EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tendersList: {
    flex: 1,
  },
  tenderCard: {
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
  tenderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tenderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  tenderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tenderStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tenderDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  tenderDetails: {
    gap: 8,
    marginBottom: 16,
  },
  tenderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tenderDetailText: {
    fontSize: 14,
    color: '#374151',
  },
  bidsSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  bidsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  bidItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  bidContractor: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  bidAmount: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
  },
  navigationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  navigationDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Settings Styles
  settingsSection: {
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
  settingsGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  healthMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  healthMetric: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  healthValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  healthLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollView: {
    maxHeight: '90%',
    width: '100%',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#FFFFFF',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetInput: {
    flex: 1,
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