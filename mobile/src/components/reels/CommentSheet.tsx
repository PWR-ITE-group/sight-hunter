import React, { useState } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Avatar } from '../ui/Avatar';
import { TextInput } from '../ui/TextInput';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface Comment {
  id: string;
  user: { nickname: string; avatar_url?: string };
  text: string;
  created_at: string;
}

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  onAdd: (text: string) => void;
}

export function CommentSheet({ visible, onClose, comments, onAdd }: CommentSheetProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim().length > 0) {
      onAdd(text.trim());
      setText('');
    }
  };

  const renderItem = ({ item }: { item: Comment }) => (
    <View className="flex-row px-4 py-3 border-b border-border">
      <Avatar uri={item.user.avatar_url} nickname={item.user.nickname} size="sm" />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="font-bold text-app-text text-sm">{item.user.nickname}</Text>
          <Text className="text-textTertiary text-xs">{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text className="text-app-text text-sm">{item.text}</Text>
      </View>
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Komentarze" snapPoints={[60]}>
      <KeyboardAvoidingView 
        behavior="padding"
        className="flex-1"
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          className="flex-1"
          ListEmptyComponent={
            <EmptyState title="Brak komentarzy" message="Bądź pierwszy, który skomentuje!" />
          }
        />
        <View className="p-4 border-t border-border bg-surface flex-row items-center">
          <View className="flex-1 mr-2">
            <TextInput
              label=""
              placeholder="Dodaj komentarz..."
              value={text}
              onChangeText={setText}
            />
          </View>
          <Button 
            title="Wyślij"
            onPress={handleSend}
            disabled={text.trim().length === 0}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
