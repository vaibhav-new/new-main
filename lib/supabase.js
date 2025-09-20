import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImageToCloudinary } from './cloudinary';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth functions
export const signUp = async (email, password, userType = 'user', profileData) => {
  try {
    // First, create the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType,
          full_name: profileData.fullName || profileData.firstName + ' ' + profileData.lastName,
        }
      }
    });

    if (error) {
      console.error('Auth signup error:', error);
      return { error };
    }

    // If user creation was successful and we have a user
    if (data.user) {
      // Wait a moment for the user to be fully created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now create the profile record - FIXED: removed user_id field
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id, // This is the primary key that references auth.users(id)
            email: email, // Add email field
            first_name: profileData.firstName || '',
            last_name: profileData.lastName || '',
            full_name: profileData.fullName || (profileData.firstName + ' ' + profileData.lastName),
            phone: profileData.phone || '',
            address: profileData.address || '',
            city: profileData.city || '',
            state: profileData.state || '',
            postal_code: profileData.postalCode || '',
            user_type: userType,
            is_verified: false, // Will be updated when email is verified
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Try to clean up the auth user if profile creation fails
        await supabase.auth.signOut();
        return { error: profileError };
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('SignUp error:', error);
    return { error };
  }
};

export const sendVerificationEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update last login time
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    console.log('Signed in successfully:', data);

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    console.error('SignIn error:', error.message);
    return { user: null, session: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

// Password reset function
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myapp://reset-password',
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Update password function
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Upload avatar function
export const uploadAvatar = async (imageUri, userId) => {
  try {
    // Upload to Cloudinary
    const uploadResult = await uploadImageToCloudinary(imageUri);
    if (uploadResult.error) {
      throw new Error(uploadResult.error);
    }

    // Update profile with new avatar URL
    const { data, error } = await supabase
      .from('profiles')
      .update({
        avatar_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user's issues
export const getUserIssues = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Update notification settings
export const updateNotificationSettings = async (userId, settings) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        notification_settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Issues functions
export const createIssue = async (issueData) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Ensure user_id is set
    const issueWithUserId = {
      ...issueData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('issues')
      .insert([issueWithUserId])
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getIssues = async (filters = {}) => {
  try {
    let query = supabase
      .from('issues')
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getIssueById = async (issueId) => {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .eq('id', issueId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateIssue = async (issueId, updates) => {
  try {
    const { data, error } = await supabase
      .from('issues')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', issueId)
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Enhanced issues functions with location support
export const getIssuesWithLocation = async (filters = {}) => {
  try {
    let query = supabase
      .from('issues')
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.area) {
      query = query.eq('area', filters.area);
    }

    if (filters.ward) {
      query = query.eq('ward', filters.ward);
    }

    // Location-based filtering
    if (filters.bounds) {
      const { north, south, east, west } = filters.bounds;
      query = query
        .gte('latitude', south)
        .lte('latitude', north)
        .gte('longitude', west)
        .lte('longitude', east);
    }

    // Date filtering
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Search filtering
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location_name.ilike.%${filters.search}%`);
    }
    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Issue voting functions
export const voteOnIssue = async (issueId, voteType) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // First, check if user has already voted
    const { data: existingVote, error: checkError } = await supabase
      .from('issue_votes')
      .select('*')
      .eq('issue_id', issueId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    let voteData;

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote_type === voteType) {
        // Same vote - remove it
        const { error: deleteError } = await supabase
          .from('issue_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) throw deleteError;
        voteData = null;
      } else {
        // Different vote - update it
        const { data, error: updateError } = await supabase
          .from('issue_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) throw updateError;
        voteData = data;
      }
    } else {
      // Create new vote
      const { data, error: insertError } = await supabase
        .from('issue_votes')
        .insert([{
          issue_id: issueId,
          user_id: user.id,
          vote_type: voteType
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      voteData = data;
    }

    // Update issue vote counts
    const { data: votes, error: countError } = await supabase
      .from('issue_votes')
      .select('vote_type')
      .eq('issue_id', issueId);

    if (countError) throw countError;

    const upvotes = votes.filter(v => v.vote_type === 'upvote').length;
    const downvotes = votes.filter(v => v.vote_type === 'downvote').length;

    const { error: updateIssueError } = await supabase
      .from('issues')
      .update({ upvotes, downvotes })
      .eq('id', issueId);

    if (updateIssueError) throw updateIssueError;

    return { data: voteData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user's vote on an issue
export const getUserVote = async (issueId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from('issue_votes')
      .select('vote_type')
      .eq('issue_id', issueId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Issue comments functions
export const createIssueComment = async (issueId, content, attachments = []) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('issue_comments')
      .insert([{
        issue_id: issueId,
        user_id: user.id,
        content,
        attachments
      }])
      .select(`
        *,
        profiles:user_id (
          full_name,
          first_name,
          last_name,
          user_type
        )
      `)
      .single();

    if (error) throw error;

    // Update comment count
    const { data: comments } = await supabase
      .from('issue_comments')
      .select('id')
      .eq('issue_id', issueId);

    await supabase
      .from('issues')
      .update({ comments_count: comments?.length || 0 })
      .eq('id', issueId);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getIssueComments = async (issueId) => {
  try {
    const { data, error } = await supabase
      .from('issue_comments')
      .select(`
        *,
        profiles:user_id (
          full_name,
          first_name,
          last_name,
          user_type
        )
      `)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get unique areas for filtering
export const getAreas = async () => {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('area')
      .not('area', 'is', null)
      .order('area');

    if (error) throw error;

    // Get unique areas
    const uniqueAreas = [...new Set(data.map(item => item.area))].filter(Boolean);
    return { data: uniqueAreas, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get unique wards for filtering
export const getWards = async () => {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('ward')
      .not('ward', 'is', null)
      .order('ward');

    if (error) throw error;

    // Get unique wards
    const uniqueWards = [...new Set(data.map(item => item.ward))].filter(Boolean);
    return { data: uniqueWards, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Community posts functions
export const createPost = async (postData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const postWithUserId = {
      ...postData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('community_posts')
      .insert([postWithUserId])
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getPosts = async (filters = {}) => {
  try {
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          email,
          user_type,
          full_name,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get community feed with issues and posts combined
export const getCommunityFeed = async (filters = {}) => {
  try {
    // Get issues as community posts
    let issuesQuery = supabase
      .from('issues')
      .select(`
        id,
        title,
        description,
        category,
        priority,
        status,
        location_name,
        address,
        area,
        ward,
        latitude,
        longitude,
        images,
        upvotes,
        downvotes,
        comments_count,
        views_count,
        tags,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          email,
          user_type,
          full_name,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // Get regular community posts
    let postsQuery = supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        category,
        tags,
        images,
        likes_count,
        comments_count,
        shares_count,
        views_count,
        is_official,
        is_pinned,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          email,
          user_type,
          full_name,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      issuesQuery = issuesQuery.eq('category', filters.category);
      postsQuery = postsQuery.eq('category', filters.category);
    }

    if (filters.location) {
      issuesQuery = issuesQuery.or(`location_name.ilike.%${filters.location}%,address.ilike.%${filters.location}%,area.ilike.%${filters.location}%`);
    }

    if (filters.status && filters.status !== 'all') {
      issuesQuery = issuesQuery.eq('status', filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      issuesQuery = issuesQuery.eq('priority', filters.priority);
    }

    if (filters.dateFrom) {
      issuesQuery = issuesQuery.gte('created_at', filters.dateFrom);
      postsQuery = postsQuery.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      issuesQuery = issuesQuery.lte('created_at', filters.dateTo);
      postsQuery = postsQuery.lte('created_at', filters.dateTo);
    }

    // Search filtering
    if (filters.search) {
      issuesQuery = issuesQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location_name.ilike.%${filters.search}%`);
      postsQuery = postsQuery.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // User type filtering
    if (filters.userType && filters.userType !== 'all') {
      issuesQuery = issuesQuery.eq('profiles.user_type', filters.userType);
      postsQuery = postsQuery.eq('profiles.user_type', filters.userType);
    }
    // Execute queries
    const [issuesResult, postsResult] = await Promise.all([
      issuesQuery,
      postsQuery
    ]);

    if (issuesResult.error) throw issuesResult.error;
    if (postsResult.error) throw postsResult.error;

    // Transform issues to feed format
    const issuesFeed = (issuesResult.data || []).map(issue => ({
      ...issue,
      type: 'issue',
      content: issue.description,
      location: issue.location_name || issue.address,
      full_address: issue.address,
      coordinates: issue.latitude && issue.longitude ? {
        latitude: parseFloat(issue.latitude),
        longitude: parseFloat(issue.longitude)
      } : null,
      engagement: {
        likes: issue.upvotes,
        dislikes: issue.downvotes,
        comments: issue.comments_count,
        shares: 0,
        views: issue.views_count || 0
      }
    }));

    // Transform posts to feed format
    const postsFeed = (postsResult.data || []).map(post => ({
      ...post,
      type: 'post',
      description: post.content,
      location: null,
      full_address: null,
      coordinates: null,
      engagement: {
        likes: post.likes_count,
        dislikes: 0,
        comments: post.comments_count,
        shares: post.shares_count,
        views: post.views_count || 0
      }
    }));

    // Combine and sort by date
    const combinedFeed = [...issuesFeed, ...postsFeed]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { data: combinedFeed, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get leaderboard data based on user activities
export const getLeaderboard = async (period = 'month') => {
  try {
    let dateFilter = '';
    const now = new Date();

    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString();
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = monthAgo.toISOString();
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        dateFilter = quarterAgo.toISOString();
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = yearAgo.toISOString();
        break;
      default:
        dateFilter = '1970-01-01T00:00:00.000Z'; // All time
    }

    // Get user profiles with points
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        first_name,
        last_name,
        avatar_url,
        points,
        user_type
      `)
      .order('points', { ascending: false })
      .limit(100);

    if (profilesError) throw profilesError;

    // Calculate stats for each user
    const leaderboardData = await Promise.all(
      profiles.map(async (profile, index) => {
        // Get issues count
        const { data: issues } = await supabase
          .from('issues')
          .select('id, status, priority, created_at')
          .eq('user_id', profile.id)
          .gte('created_at', dateFilter);

        // Get posts count
        const { data: posts } = await supabase
          .from('community_posts')
          .select('id, created_at')
          .eq('user_id', profile.id)
          .gte('created_at', dateFilter);

        // Get votes received on their issues
        const { data: votesReceived } = await supabase
          .from('issue_votes')
          .select('vote_type, issues!inner(user_id)')
          .eq('issues.user_id', profile.id);

        const issuesCount = issues?.length || 0;
        const postsCount = posts?.length || 0;
        const resolvedIssues = issues?.filter(i => i.status === 'resolved').length || 0;
        const highPriorityIssues = issues?.filter(i => i.priority === 'high' || i.priority === 'urgent').length || 0;
        const upvotesReceived = votesReceived?.filter(v => v.vote_type === 'upvote').length || 0;

        // Calculate dynamic score based on activities
        const baseScore = profile.points || 0;
        const activityScore = (issuesCount * 10) + (postsCount * 5) + (resolvedIssues * 25) +
          (highPriorityIssues * 15) + (upvotesReceived * 2);

        const totalScore = baseScore + activityScore;

        // Generate badges based on activity
        const badges = [];
        if (issuesCount >= 50) badges.push('🏆'); // Top Reporter
        if (resolvedIssues >= 20) badges.push('🌟'); // Problem Solver
        if (postsCount >= 30) badges.push('💬'); // Community Contributor
        if (totalScore >= 1000) badges.push('🚀'); // Super User
        if (upvotesReceived >= 100) badges.push('👍'); // Popular
        if (highPriorityIssues >= 10) badges.push('🚨'); // Alert Citizen

        return {
          ...profile,
          rank: index + 1,
          issues_reported: issuesCount,
          posts_created: postsCount,
          issues_resolved: resolvedIssues,
          high_priority_issues: highPriorityIssues,
          upvotes_received: upvotesReceived,
          total_score: totalScore,
          badges: badges.slice(0, 3), // Limit to 3 badges
          activity_score: activityScore,
          level: getLevel(totalScore)
        };
      })
    );

    // Re-sort by total score
    leaderboardData.sort((a, b) => b.total_score - a.total_score);
    leaderboardData.forEach((user, index) => {
      user.rank = index + 1;
    });

    return { data: leaderboardData, error: null };  // ✅ fixed

  } catch (error) {
    return { data: null, error };
  }
};

// Helper function to determine user level
const getLevel = (score) => {
  if (score >= 2000) return 'Champion';
  if (score >= 1000) return 'Expert';
  if (score >= 500) return 'Advanced';
  if (score >= 100) return 'Intermediate';
  return 'Beginner';
};

// Update user points based on activities
export const updateUserPoints = async (userId, activity, points) => {
  try {
    const { data: profile, error: getError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (getError) throw getError;

    const newPoints = (profile.points || 0) + points;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Enhanced admin functions
export const getAdminDashboardStats = async () => {
  try {
    const [issuesResult, postsResult, usersResult, tendersResult, feedbackResult] = await Promise.all([
      supabase.from('issues').select('id, status, priority, category, created_at, user_id'),
      supabase.from('community_posts').select('id, category, created_at, user_id'),
      supabase.from('profiles').select('id, user_type, is_verified, created_at, points'),
      supabase.from('tenders').select('id, status, created_at'),
      supabase.from('feedback').select('id, status, type, created_at')
    ]);

    const issues = issuesResult.data || [];
    const posts = postsResult.data || [];
    const users = usersResult.data || [];
    const tenders = tendersResult.data || [];
    const feedback = feedbackResult.data || [];

    // Calculate time-based metrics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentIssues = issues.filter(i => new Date(i.created_at) >= lastWeek);
    const monthlyIssues = issues.filter(i => new Date(i.created_at) >= lastMonth);

    const stats = {
      total_issues: issues.length,
      pending_issues: issues.filter(i => i.status === 'pending').length,
      in_progress_issues: issues.filter(i => i.status === 'in_progress').length,
      resolved_issues: issues.filter(i => i.status === 'resolved').length,
      high_priority_issues: issues.filter(i => i.priority === 'high').length,
      urgent_issues: issues.filter(i => i.priority === 'urgent').length,
      recent_issues: recentIssues.length,
      monthly_issues: monthlyIssues.length,
      total_posts: posts.length,
      total_users: users.length,
      verified_users: users.filter(u => u.is_verified).length,
      active_users: users.filter(u => (u.points || 0) > 0).length,
      total_tenders: tenders.length,
      active_tenders: tenders.filter(t => t.status === 'available').length,
      total_feedback: feedback.length,
      pending_feedback: feedback.filter(f => f.status === 'pending').length,
      response_time: calculateAverageResponseTime(issues),
      resolution_rate: issues.length > 0 ? Math.round((issues.filter(i => i.status === 'resolved').length / issues.length) * 100) : 0,
      categories_breakdown: getCategoriesBreakdown(issues),
      priority_breakdown: getPriorityBreakdown(issues),
      monthly_trend: getMonthlyTrend(issues)
    };

    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Helper functions for admin stats
const calculateAverageResponseTime = (issues) => {
  const resolvedIssues = issues.filter(issue =>
    issue.status === 'resolved' && issue.resolved_at && issue.created_at
  );

  if (resolvedIssues.length === 0) return '0 days';

  const totalDays = resolvedIssues.reduce((sum, issue) => {
    const created = new Date(issue.created_at);
    const resolved = new Date(issue.resolved_at);
    const days = Math.ceil((resolved - created) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return `${Math.round(totalDays / resolvedIssues.length)} days`;
};

const getCategoriesBreakdown = (issues) => {
  const breakdown = {};
  issues.forEach(issue => {
    breakdown[issue.category] = (breakdown[issue.category] || 0) + 1;
  });
  return breakdown;
};

const getPriorityBreakdown = (issues) => {
  const breakdown = {};
  issues.forEach(issue => {
    breakdown[issue.priority] = (breakdown[issue.priority] || 0) + 1;
  });
  return breakdown;
};

const getMonthlyTrend = (issues) => {
  const months = {};
  issues.forEach(issue => {
    const month = new Date(issue.created_at).toISOString().slice(0, 7); // YYYY-MM
    months[month] = (months[month] || 0) + 1;
  });
  return months;
};

// Create tender from issue
export const createTenderFromIssue = async (issueId, tenderData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get issue details
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issueError) throw issueError;

    // Create tender based on issue
    const tender = {
      posted_by: user.id,
      title: tenderData.title || `Tender for: ${issue.title}`,
      description: tenderData.description || `${issue.description}\n\nOriginal Issue ID: ${issueId}`,
      category: issue.category,
      location: issue.location_name || issue.address,
      area: issue.area,
      ward: issue.ward,
      estimated_budget_min: tenderData.estimated_budget_min,
      estimated_budget_max: tenderData.estimated_budget_max,
      deadline_date: tenderData.deadline_date,
      submission_deadline: tenderData.submission_deadline,
      priority: issue.priority,
      requirements: tenderData.requirements || [],
      metadata: {
        source_issue_id: issueId,
        source_type: 'issue'
      }
    };

    const { data, error } = await supabase
      .from('tenders')
      .insert([tender])
      .select()
      .single();

    if (error) throw error;

    // Update issue status
    await supabase
      .from('issues')
      .update({
        status: 'in_progress',
        assigned_department: 'Tender Management',
        updated_at: new Date().toISOString()
      })
      .eq('id', issueId);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Increment issue view count
export const incrementIssueViews = async (issueId) => {
  try {
    const { error } = await supabase.rpc('increment_issue_views', {
      issue_id: issueId
    });

    // Fallback if RPC doesn't exist
    if (error) {
      const { data: issue } = await supabase
        .from('issues')
        .select('views_count')
        .eq('id', issueId)
        .single();

      if (issue) {
        await supabase
          .from('issues')
          .update({ views_count: (issue.views_count || 0) + 1 })
          .eq('id', issueId);
      }
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Get trending issues (most viewed/voted in last 24 hours)
export const getTrendingIssues = async (limit = 10) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        profiles:user_id (
          full_name,
          first_name,
          last_name,
          avatar_url,
          user_type
        )
      `)
      .gte('created_at', yesterday)
      .order('views_count', { ascending: false })
      .order('upvotes', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
// Tenders functions
export const createTender = async (tenderData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const tenderWithUserId = {
      ...tenderData,
      posted_by: user.id,
    };

    const { data, error } = await supabase
      .from('tenders')
      .insert([tenderWithUserId])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getTenders = async (status = 'available') => {
  try {
    let query = supabase
      .from('tenders')
      .select(`
        *,
        bids (
          id,
          amount,
          details,
          user_id,
          status,
          profiles:user_id (
            email,
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createBid = async (bidData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const bidWithUserId = {
      ...bidData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('bids')
      .insert([bidWithUserId])
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        ),
        tenders:tender_id (
          title
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user's bids
export const getUserBids = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        tenders:tender_id (
          title,
          status,
          deadline_date
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Feedback functions
export const createFeedback = async (feedbackData) => {
  try {
    // Just insert the object you pass from FeedbackForm.js
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error inserting feedback:", error);
    return { data: null, error };
  }
};

// ✅ Get feedback for logged-in user
export const getUserFeedback = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user feedback:", error);
    return { data: null, error };
  }
};

// Municipal officials functions
export const getMunicipalOfficials = async () => {
  try {
    const { data, error } = await supabase
      .from('municipal_officials')
      .select('*')
      .eq('is_active', true)
      .order('department', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Notifications functions
export const getUserNotifications = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Utility function to handle auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};