import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Avatar } from '../ui/Avatar';
import { TextInput } from '../ui/TextInput';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { components } from '../../api/schema';
import { formatDate } from '../../utils/formatters';

type Comment = components['schemas']['Comment'];

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  loading?: boolean;
  sending?: boolean;
  onAdd: (text: string) => void;
}

export function CommentSheet({ visible, onClose, comments, loading = false, sending = false, onAdd }: CommentSheetProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onAdd(trimmed);
      setText('');
    }
  };

  const renderItem = ({ item }: { item: Comment }) => (
    <View className="flex-row px-4 py-3 border-b border-app-border">
      <Avatar nickname={item.author_nickname} size="sm" />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="font-bold text-app-text text-sm">{item.author_nickname}</Text>
          <Text className="text-text-tertiary text-xs">{formatDate(item.created_at)}</Text>
        </View>
        <Text className="text-app-text text-sm">{item.text}</Text>
      </View>
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Komentarze">
      <View style={{ height: 380 }}>
        {loading ? (
          <LoadingSpinner className="flex-1" />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            className="flex-1"
            ListEmptyComponent={
              <EmptyState title="Brak komentarzy" message="Bądź pierwszy, który skomentuje!" />
            }
          />
        )}
        <View className="pt-3 border-t border-app-border flex-row items-center">
          <View className="flex-1 mr-2">
            <TextInput label="Komentarz" value={text} onChangeText={setText} />
          </View>
          <Button
            title="Wyślij"
            onPress={handleSend}
            disabled={text.trim().length === 0}
            loading={sending}
            variant="primary"
          />
        </View>
      </View>
    </BottomSheet>
  );
}
