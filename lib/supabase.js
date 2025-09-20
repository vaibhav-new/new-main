> {
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
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) throw error;

    // Send notification if user provided contact info
    if (feedbackData.user_id) {
      await createNotification(
        feedbackData.user_id,
        'Feedback Received',
        'Thank you for your feedback. We will review it and respond if necessary.',
        'feedback',
        data.id
      );
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error inserting feedback:", error);
    return { data: null, error };
  }
};

// Create notification function
export const createNotification = async (userId, title, message, type, relatedId = null) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        related_id: relatedId,
        is_read: false,
        is_sent: false
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
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