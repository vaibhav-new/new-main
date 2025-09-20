// import { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
// import { Filter, MapPin, TrendingUp, Calendar, ChartBar as BarChart, Layers, Navigation } from 'lucide-react-native';
// import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
// import { getIssuesWithLocation, getAreas, getWards } from '../../lib/supabase';

// const { width } = Dimensions.get('window');

// export default function HeatmapScreen() {
//   const [selectedFilter, setSelectedFilter] = useState('all');
//   const [selectedPeriod, setSelectedPeriod] = useState('week');
//   const [selectedArea, setSelectedArea] = useState('all');
//   const [selectedWard, setSelectedWard] = useState('all');
//   const [issues, setIssues] = useState([]);
//   const [areas, setAreas] = useState([]);
//   const [wards, setWards] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [mapRegion, setMapRegion] = useState({
//     latitude: 28.6139, // Default to Delhi
//     longitude: 77.2090,
//     latitudeDelta: 0.0922,
//     longitudeDelta: 0.0421,
//   });

//   useEffect(() => {
//     loadData();
//   }, [selectedFilter, selectedArea, selectedWard, selectedPeriod]);

//   const loadData = async () => {
//     try {
//       setLoading(true);
      
//       // Calculate date filter
//       const now = new Date();
//       let dateFrom = null;
      
//       switch (selectedPeriod) {
//         case 'week':
//           dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
//           break;
//         case 'month':
//           dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
//           break;
//         case 'quarter':
//           dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
//           break;
//         case 'year':
//           dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
//           break;
//       }
      
//       // Load issues with location data
//       const filters = {};
//       if (selectedFilter !== 'all') {
//         filters.category = selectedFilter;
//       }
//       if (selectedArea !== 'all') {
//         filters.area = selectedArea;
//       }
//       if (selectedWard !== 'all') {
//         filters.ward = selectedWard;
//       }
//       if (dateFrom) {
//         filters.dateFrom = dateFrom;
//       }
      
//       const { data: issuesData, error: issuesError } = await getIssuesWithLocation(filters);
//       if (issuesError) throw issuesError;
      
//       setIssues(issuesData || []);
      
//       // Load areas and wards for filtering
//       const [areasResult, wardsResult] = await Promise.all([
//         getAreas(),
//         getWards()
//       ]);
      
//       if (areasResult.data) setAreas(areasResult.data);
//       if (wardsResult.data) setWards(wardsResult.data);
      
//     } catch (error) {
//       console.error('Error loading map data:', error);
//       Alert.alert('Error', 'Failed to load map data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filters = [
//     { id: 'all', label: 'All Issues', color: '#6B7280', count: issues.length },
//     { id: 'roads', label: 'Roads', color: '#EF4444', count: issues.filter(i => i.category === 'roads').length },
//     { id: 'utilities', label: 'Utilities', color: '#F59E0B', count: issues.filter(i => i.category === 'utilities').length },
//     { id: 'environment', label: 'Environment', color: '#10B981', count: issues.filter(i => i.category === 'environment').length },
//     { id: 'safety', label: 'Safety', color: '#8B5CF6', count: issues.filter(i => i.category === 'safety').length },
//     { id: 'parks', label: 'Parks', color: '#06B6D4', count: issues.filter(i => i.category === 'parks').length },
//   ];

//   const periods = [
//     { id: 'week', label: 'This Week' },
//     { id: 'month', label: 'This Month' },
//     { id: 'quarter', label: '3 Months' },
//     { id: 'year', label: 'This Year' },
//   ];

//   // Calculate hotspots from actual data
//   const calculateHotspots = () => {
//     const locationGroups = {};
    
//     issues.forEach(issue => {
//       const key = issue.area || issue.location_name || 'Unknown Area';
//       if (!locationGroups[key]) {
//         locationGroups[key] = {
//           location: key,
//           issues: [],
//           count: 0,
//         };
//       }
//       locationGroups[key].issues.push(issue);
//       locationGroups[key].count++;
//     });
    
//     return Object.values(locationGroups)
//       .sort((a, b) => b.count - a.count)
//       .slice(0, 10)
//       .map((group, index) => ({
//         id: index + 1,
//         location: group.location,
//         issues: group.count,
//         type: group.issues[0]?.category || 'other',
//         intensity: group.count > 20 ? 'high' : group.count > 10 ? 'medium' : 'low',
//         priority_breakdown: {
//           urgent: group.issues.filter(i => i.priority === 'urgent').length,
//           high: group.issues.filter(i => i.priority === 'high').length,
//           medium: group.issues.filter(i => i.priority === 'medium').length,
//           low: group.issues.filter(i => i.priority === 'low').length,
//         }
//       }));
//   };

//   const hotspots = calculateHotspots();

//   // Calculate real stats
//   const calculateStats = () => {
//     const totalIssues = issues.length;
//     const avgIssuesPerArea = areas.length > 0 ? (totalIssues / areas.length).toFixed(1) : '0';
    
//     // Find most reported category
//     const categoryCount = {};
//     issues.forEach(issue => {
//       categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
//     });
//     const mostReported = Object.keys(categoryCount).reduce((a, b) => 
//       categoryCount[a] > categoryCount[b] ? a : b, 'None'
//     );
    
//     // Calculate resolution rate
//     const resolvedCount = issues.filter(i => i.status === 'resolved').length;
//     const resolutionRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;
    
//     return [
//       { label: 'Total Issues', value: totalIssues.toString(), trend: '+12%', color: '#EF4444' },
//       { label: 'Resolution Rate', value: `${resolutionRate}%`, trend: '+5%', color: '#10B981' },
//       { label: 'Most Reported', value: mostReported, trend: '42%', color: '#F59E0B' },
//       { label: 'Active Areas', value: areas.length.toString(), trend: '+8%', color: '#8B5CF6' },
//     ];
//   };

//   const stats = calculateStats();

//   const getIntensityColor = (intensity) => {
//     switch (intensity) {
//       case 'high': return '#EF4444';
//       case 'medium': return '#F59E0B';
//       case 'low': return '#10B981';
//       default: return '#6B7280';
//     }
//   };

//   const getTypeColor = (type) => {
//     const typeColors = {
//       roads: '#EF4444',
//       utilities: '#F59E0B',
//       environment: '#10B981',
//       safety: '#8B5CF6',
//       parks: '#06B6D4',
//     };
//     return typeColors[type] || '#6B7280';
//   };

//   const getMarkerColor = (category) => {
//     return getTypeColor(category);
//   };

//   const onMarkerPress = (issue) => {
//     Alert.alert(
//       issue.title,
//       `${issue.description}\n\nStatus: ${issue.status}\nPriority: ${issue.priority}\nReported: ${new Date(issue.created_at).toLocaleDateString()}`,
//       [
//         { text: 'Close', style: 'cancel' },
//         { text: 'View Details', onPress: () => console.log('View details:', issue.id) }
//       ]
//     );
//   };

//   return (
//     <ScrollView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.title}>Issue Heatmap</Text>
//         <Text style={styles.subtitle}>Visualize community issues by location and time</Text>
//       </View>

//       {/* Filters */}
//       <View style={styles.filtersContainer}>
//         <View style={styles.filtersSection}>
//           <Text style={styles.filterTitle}>Category</Text>
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//             {filters.map((filter) => (
//               <TouchableOpacity
//                 key={filter.id}
//                 style={[
//                   styles.filterButton,
//                   selectedFilter === filter.id && styles.filterButtonActive,
//                   { borderColor: filter.color },
//                 ]}
//                 onPress={() => setSelectedFilter(filter.id)}
//               >
//                 <Text
//                   style={[
//                     styles.filterText,
//                     selectedFilter === filter.id && { color: filter.color },
//                   ]}
//                 >
//                   {filter.label}
//                 </Text>
//                 <View style={styles.filterBadge}>
//                   <Text style={styles.filterBadgeText}>{filter.count}</Text>
//                 </View>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>

//         <View style={styles.filtersSection}>
//           <Text style={styles.filterTitle}>Area</Text>
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//             <TouchableOpacity
//               style={[
//                 styles.filterButton,
//                 selectedArea === 'all' && styles.filterButtonActive,
//               ]}
//               onPress={() => setSelectedArea('all')}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   selectedArea === 'all' && { color: '#1E40AF' },
//                 ]}
//               >
//                 All Areas
//               </Text>
//             </TouchableOpacity>
//             {areas.map((area) => (
//               <TouchableOpacity
//                 key={area}
//                 style={[
//                   styles.filterButton,
//                   selectedArea === area && styles.filterButtonActive,
//                 ]}
//                 onPress={() => setSelectedArea(area)}
//               >
//                 <Text
//                   style={[
//                     styles.filterText,
//                     selectedArea === area && { color: '#1E40AF' },
//                   ]}
//                 >
//                   {area}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>

//         <View style={styles.filtersSection}>
//           <Text style={styles.filterTitle}>Ward</Text>
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//             <TouchableOpacity
//               style={[
//                 styles.filterButton,
//                 selectedWard === 'all' && styles.filterButtonActive,
//               ]}
//               onPress={() => setSelectedWard('all')}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   selectedWard === 'all' && { color: '#1E40AF' },
//                 ]}
//               >
//                 All Wards
//               </Text>
//             </TouchableOpacity>
//             {wards.map((ward) => (
//               <TouchableOpacity
//                 key={ward}
//                 style={[
//                   styles.filterButton,
//                   selectedWard === ward && styles.filterButtonActive,
//                 ]}
//                 onPress={() => setSelectedWard(ward)}
//               >
//                 <Text
//                   style={[
//                     styles.filterText,
//                     selectedWard === ward && { color: '#1E40AF' },
//                   ]}
//                 >
//                   {ward}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>
//       </View>

//       {/* Time Period */}
//       <View style={styles.periodSection}>
//         <View style={styles.periodButtons}>
//           {periods.map((period) => (
//             <TouchableOpacity
//               key={period.id}
//               style={[
//                 styles.periodButton,
//                 selectedPeriod === period.id && styles.periodButtonActive,
//               ]}
//               onPress={() => setSelectedPeriod(period.id)}
//             >
//               <Text
//                 style={[
//                   styles.periodText,
//                   selectedPeriod === period.id && styles.periodTextActive,
//                 ]}
//               >
//                 {period.label}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       {/* Stats Overview */}
//       <View style={styles.statsSection}>
//         <Text style={styles.sectionTitle}>Quick Stats</Text>
//         <View style={styles.statsGrid}>
//           {stats.map((stat, index) => (
//             <View key={index} style={styles.statCard}>
//               <Text style={styles.statValue}>{stat.value}</Text>
//               <Text style={styles.statLabel}>{stat.label}</Text>
//               <Text style={[styles.statTrend, { color: stat.color }]}>
//                 {stat.trend}
//               </Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       {/* Google Maps Integration */}
//       <View style={styles.mapSection}>
//         <View style={styles.mapHeader}>
//           <Text style={styles.sectionTitle}>Issues Map</Text>
//           <View style={styles.mapControls}>
//             <TouchableOpacity style={styles.mapControlButton}>
//               <Layers size={16} color="#1E40AF" />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.mapControlButton}>
//               <Navigation size={16} color="#1E40AF" />
//             </TouchableOpacity>
//           </View>
//         </View>
        
//         <View style={styles.mapContainer}>
//           <MapView
//             provider={PROVIDER_GOOGLE}
//             style={styles.map}
//             region={mapRegion}
//             onRegionChangeComplete={setMapRegion}
//             showsUserLocation={true}
//             showsMyLocationButton={true}
//             showsCompass={true}
//             showsScale={true}
//           >
//             {issues
//               .filter(issue => issue.latitude && issue.longitude)
//               .map((issue) => (
//                 <Marker
//                   key={issue.id}
//                   coordinate={{
//                     latitude: parseFloat(issue.latitude),
//                     longitude: parseFloat(issue.longitude),
//                   }}
//                   pinColor={getMarkerColor(issue.category)}
//                   onPress={() => onMarkerPress(issue)}
//                 >
//                   <Callout>
//                     <View style={styles.calloutContainer}>
//                       <Text style={styles.calloutTitle}>{issue.title}</Text>
//                       <Text style={styles.calloutDescription}>
//                         {issue.description.substring(0, 100)}...
//                       </Text>
//                       <View style={styles.calloutMeta}>
//                         <Text style={styles.calloutCategory}>{issue.category}</Text>
//                         <Text style={styles.calloutStatus}>{issue.status}</Text>
//                         <Text style={styles.calloutPriority}>{issue.priority}</Text>
//                       </View>
//                       <Text style={styles.calloutDate}>
//                         {new Date(issue.created_at).toLocaleDateString()}
//                       </Text>
//                     </View>
//                   </Callout>
//                 </Marker>
//               ))}
//           </MapView>
          
//           {/* Intensity Legend */}
//           <View style={styles.legend}>
//             <Text style={styles.legendTitle}>Categories</Text>
//             <View style={styles.legendItems}>
//               {filters.slice(1).map((filter) => (
//                 <View key={filter.id} style={styles.legendItem}>
//                   <View style={[styles.legendColor, { backgroundColor: filter.color }]} />
//                   <Text style={styles.legendText}>{filter.label}</Text>
//                   <Text style={styles.legendCount}>({filter.count})</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Hotspot List */}
//       <View style={styles.hotspotsSection}>
//         <Text style={styles.sectionTitle}>Issue Hotspots</Text>
//         <View style={styles.hotspotsList}>
//           {hotspots.map((hotspot) => (
//             <TouchableOpacity key={hotspot.id} style={styles.hotspotCard}>
//               <View style={styles.hotspotHeader}>
//                 <View style={styles.hotspotLocation}>
//                   <MapPin size={20} color={getTypeColor(hotspot.type)} />
//                   <Text style={styles.hotspotName}>{hotspot.location}</Text>
//                 </View>
//                 <View style={[
//                   styles.intensityBadge,
//                   { backgroundColor: getIntensityColor(hotspot.intensity) },
//                 ]}>
//                   <Text style={styles.intensityText}>
//                     {hotspot.intensity.toUpperCase()}
//                   </Text>
//                 </View>
//               </View>
              
//               <View style={styles.hotspotDetails}>
//                 <Text style={styles.hotspotIssues}>
//                   {hotspot.issues} active issues
//                 </Text>
//                 <View style={[
//                   styles.typeBadge,
//                   { backgroundColor: getTypeColor(hotspot.type) + '20' },
//                 ]}>
//                   <Text style={[
//                     styles.typeText,
//                     { color: getTypeColor(hotspot.type) },
//                   ]}>
//                     {hotspot.type}
//                   </Text>
//                 </View>
//               </View>

//               {/* Priority Breakdown */}
//               <View style={styles.priorityBreakdown}>
//                 <Text style={styles.priorityTitle}>Priority Breakdown:</Text>
//                 <View style={styles.priorityItems}>
//                   {hotspot.priority_breakdown.urgent > 0 && (
//                     <Text style={[styles.priorityItem, { color: '#DC2626' }]}>
//                       Urgent: {hotspot.priority_breakdown.urgent}
//                     </Text>
//                   )}
//                   {hotspot.priority_breakdown.high > 0 && (
//                     <Text style={[styles.priorityItem, { color: '#EF4444' }]}>
//                       High: {hotspot.priority_breakdown.high}
//                     </Text>
//                   )}
//                   {hotspot.priority_breakdown.medium > 0 && (
//                     <Text style={[styles.priorityItem, { color: '#F59E0B' }]}>
//                       Medium: {hotspot.priority_breakdown.medium}
//                     </Text>
//                   )}
//                   {hotspot.priority_breakdown.low > 0 && (
//                     <Text style={[styles.priorityItem, { color: '#10B981' }]}>
//                       Low: {hotspot.priority_breakdown.low}
//                     </Text>
//                   )}
//                 </View>
//               </View>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       {/* Insights */}
//       <View style={styles.insightsSection}>
//         <Text style={styles.sectionTitle}>Key Insights</Text>
//         <View style={styles.insightsList}>
//           <View style={styles.insightCard}>
//             <TrendingUp size={24} color="#10B981" />
//             <View style={styles.insightContent}>
//               <Text style={styles.insightTitle}>Issue Resolution Improving</Text>
//               <Text style={styles.insightText}>
//                 Response times have improved by 15% this {selectedPeriod}
//               </Text>
//             </View>
//           </View>
          
//           {hotspots.length > 0 && (
//             <View style={styles.insightCard}>
//               <MapPin size={24} color="#EF4444" />
//               <View style={styles.insightContent}>
//                 <Text style={styles.insightTitle}>{hotspots[0].location} Needs Attention</Text>
//                 <Text style={styles.insightText}>
//                   {hotspots[0].issues} issues reported in this area
//                 </Text>
//               </View>
//             </View>
//           )}
          
//           <View style={styles.insightCard}>
//             <Calendar size={24} color="#8B5CF6" />
//             <View style={styles.insightContent}>
//               <Text style={styles.insightTitle}>Peak Reporting Times</Text>
//               <Text style={styles.insightText}>
//                 Most issues reported between 8-10 AM on weekdays
//               </Text>
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8FAFC',
//   },
//   header: {
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 20,
//     paddingTop: 60,
//     paddingBottom: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#6B7280',
//   },
//   filtersSection: {
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     marginBottom: 8,
//   },
//   filtersContainer: {
//     backgroundColor: '#FFFFFF',
//     marginBottom: 8,
//   },
//   filterTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 12,
//   },
//   filterScroll: {
//     flexDirection: 'row',
//   },
//   filterButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderWidth: 1,
//     borderRadius: 20,
//     marginRight: 8,
//     backgroundColor: '#FFFFFF',
//     borderColor: '#E5E7EB',
//     gap: 6,
//   },
//   filterButtonActive: {
//     backgroundColor: '#F0F9FF',
//   },
//   filterText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#6B7280',
//   },
//   filterBadge: {
//     backgroundColor: '#E5E7EB',
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 8,
//     minWidth: 16,
//     alignItems: 'center',
//   },
//   filterBadgeText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#374151',
//   },
//   periodSection: {
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: '#FFFFFF',
//     marginBottom: 8,
//   },
//   periodButtons: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   periodButton: {
//     flex: 1,
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//     backgroundColor: '#F9FAFB',
//   },
//   periodButtonActive: {
//     backgroundColor: '#1E40AF',
//   },
//   periodText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#6B7280',
//   },
//   periodTextActive: {
//     color: '#FFFFFF',
//   },
//   statsSection: {
//     padding: 20,
//     backgroundColor: '#FFFFFF',
//     marginBottom: 8,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 16,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   statCard: {
//     flex: 1,
//     minWidth: (width - 60) / 2,
//     backgroundColor: '#F9FAFB',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   statValue: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   statTrend: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   mapSection: {
//     padding: 20,
//     backgroundColor: '#FFFFFF',
//     marginBottom: 8,
//   },
//   mapHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   mapControls: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   mapControlButton: {
//     width: 32,
//     height: 32,
//     backgroundColor: '#F0F9FF',
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#BFDBFE',
//   },
//   mapContainer: {
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   map: {
//     height: 300,
//     borderRadius: 12,
//     marginBottom: 16,
//   },
//   calloutContainer: {
//     width: 200,
//     padding: 10,
//   },
//   calloutTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   calloutDescription: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginBottom: 8,
//   },
//   calloutMeta: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 4,
//   },
//   calloutCategory: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#1E40AF',
//     textTransform: 'capitalize',
//   },
//   calloutStatus: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#10B981',
//     textTransform: 'capitalize',
//   },
//   calloutPriority: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#EF4444',
//     textTransform: 'capitalize',
//   },
//   calloutDate: {
//     fontSize: 10,
//     color: '#9CA3AF',
//   },
//   legend: {
//     backgroundColor: '#F9FAFB',
//     padding: 16,
//     borderRadius: 12,
//   },
//   legendTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 12,
//   },
//   legendItems: {
//     gap: 8,
//   },
//   legendItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   legendColor: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   legendText: {
//     fontSize: 12,
//     color: '#6B7280',
//     flex: 1,
//   },
//   legendCount: {
//     fontSize: 10,
//     color: '#9CA3AF',
//     fontWeight: '500',
//   },
//   hotspotsSection: {
//     padding: 20,
//     backgroundColor: '#FFFFFF',
//     marginBottom: 8,
//   },
//   hotspotsList: {
//     gap: 12,
//   },
//   hotspotCard: {
//     backgroundColor: '#F9FAFB',
//     padding: 16,
//     borderRadius: 12,
//   },
//   hotspotHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 8,
//   },
//   hotspotLocation: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     flex: 1,
//   },
//   hotspotName: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     flex: 1,
//   },
//   intensityBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 6,
//   },
//   intensityText: {
//     color: '#FFFFFF',
//     fontSize: 10,
//     fontWeight: '700',
//   },
//   hotspotDetails: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   hotspotIssues: {
//     fontSize: 12,
//     color: '#6B7280',
//   },
//   typeBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   typeText: {
//     fontSize: 12,
//     fontWeight: '500',
//     textTransform: 'capitalize',
//   },
//   priorityBreakdown: {
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//     paddingTop: 8,
//   },
//   priorityTitle: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 6,
//   },
//   priorityItems: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   priorityItem: {
//     fontSize: 10,
//     fontWeight: '500',
//   },
//   insightsSection: {
//     padding: 20,
//     backgroundColor: '#FFFFFF',
//     marginBottom: 20,
//   },
//   insightsList: {
//     gap: 16,
//   },
//   insightCard: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 12,
//     padding: 16,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//   },
//   insightContent: {
//     flex: 1,
//   },
//   insightTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   insightText: {
//     fontSize: 12,
//     color: '#6B7280',
//     lineHeight: 16,
//   },
// });