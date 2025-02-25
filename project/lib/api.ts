import { supabase } from './supabase';
import { Post } from './types';

export async function getPosts() {
  const { data: sessionData } = await supabase.auth.getSession();
  const anonymousUserId = localStorage.getItem('anonymousUserId');

  // Set anonymous user context if needed
  if (!sessionData.session && anonymousUserId) {
    await supabase.rpc('set_anonymous_user', { anonymous_user_id: anonymousUserId });
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function createPost(post: Omit<Post, 'id'>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const anonymousUserId = localStorage.getItem('anonymousUserId');
  
  // Set anonymous user context if needed
  if (!sessionData.session && anonymousUserId) {
    await supabase.rpc('set_anonymous_user', { anonymous_user_id: anonymousUserId });
  }

  const postData = {
    ...post,
    is_anonymous: !sessionData.session,
    user_id: sessionData.session?.user?.id || anonymousUserId || post.user_id
  };

  const { data, error } = await supabase
    .from('posts')
    .insert([postData])
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function updatePost(post: Post) {
  console.log('Updating post with data:', post);

  const { data: sessionData } = await supabase.auth.getSession();
  const anonymousUserId = localStorage.getItem('anonymousUserId');
  
  // Set anonymous user context if needed
  if (!sessionData.session && anonymousUserId) {
    await supabase.rpc('set_anonymous_user', { anonymous_user_id: anonymousUserId });
  }

  // Ensure we have an ID
  if (!post.id) {
    throw new Error('Post ID is required for update');
  }

  // Keep only the fields we want to update
  const updateData = {
    title: post.title,
    body: post.body,
    user_id: post.user_id, // Include user_id in update
    is_anonymous: !sessionData.session
  };

  console.log('Sending update request:', { id: post.id, updateData });

  try {
    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', post.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    console.log('Update successful:', data);
    return data;
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

export async function deletePost(id: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const anonymousUserId = localStorage.getItem('anonymousUserId');
  
  // Set anonymous user context if needed
  if (!sessionData.session && anonymousUserId) {
    await supabase.rpc('set_anonymous_user', { anonymous_user_id: anonymousUserId });
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting post:', error);
    throw new Error(error.message);
  }
}