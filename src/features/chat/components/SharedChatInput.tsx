import {
  IconButton,
  Input,
  Box,
  Text,
  HStack,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from '@chakra-ui/react';
import { PopoverRoot } from '@/components/ui/popover';
import { InputGroup } from '@/components/ui/input-group';
import {
  EnterIcon,
} from '@/icons/other-icons';
import { useState, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { demoResponseService } from '@/services/demo-response-service';
import { fetchCollectionsFromApi } from '@/services/collection-service';

// Build the JSON payload sent to backend for a chat message.
// Shape used here:
// {
//   content: string,
//   collection_id: string // 'all' or a collection id
// }
function buildPayload(content: string, collectionId: string) {
  return {
    content,
    collection_id: collectionId || 'all',
  };
}

// Best-effort send to backend. This is non-blocking for UI — we log errors but don't fail send flow.
async function sendPayloadToBackend(payload: { content: string; collection_id: string }) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend returned ${res.status}: ${text}`);
    }
    // If your backend returns a structured assistant response, you may handle it here.
    return await res.json();
  } catch (err) {
    console.warn('sendPayloadToBackend error:', err);
    throw err;
  }
}

// Icon dấu cộng thủ công để tránh lỗi import icon
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

interface SharedChatInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

interface Collection {
  id: string;
  name: string;
}

export function SharedChatInput({ value: externalValue, onValueChange }: SharedChatInputProps) {
  const [internalValue, setInternalValue] = useState('');
  
  // State quản lý collection
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  const { addMessage, setIsLoading } = useChatContext();

  const inputValue = externalValue !== undefined ? externalValue : internalValue;
  const setInputValue = onValueChange || setInternalValue;

  // Optionally pre-load collections on mount so menu opens faster.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsCollectionsLoading(true);
        const items = await fetchCollectionsFromApi();
        if (!mounted) return;
        if (items && items.length > 0) {
          setCollections(items.map(i => ({ id: i.id, name: i.name })));
        } else {
          // fallback mock if backend empty or unreachable
          setCollections([
            { id: 'col_1', name: 'Tài liệu Marketing' },
            { id: 'col_2', name: 'Hồ sơ Kỹ thuật' },
          ]);
        }
      } catch (err) {
        console.error('Failed to preload collections:', err);
      } finally {
        setIsCollectionsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const handleInputValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (message === '') return;

    // Logic gửi kèm collectionId
    const payload = buildPayload(message, selectedCollection ? selectedCollection.id : 'all');
    console.log("🚀 Payload gửi đi:", payload);

    addMessage(message, 'user', [], undefined);
    setInputValue('');
    setIsLoading(true);

    // Fire-and-forget: send structured payload to backend
    sendPayloadToBackend(payload).catch(err => {
      console.warn('sendPayloadToBackend failed (non-fatal):', err);
    });

    setTimeout(() => {
      const { blocks, sources } = demoResponseService.getNextResponseWithSources();
      const content = blocks
        .filter(b => b.type === 'markdown')
        .map(b => (b as any).body)
        .join('\n\n');
      addMessage(content || 'Response', 'assistant', sources, blocks);
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box w='full' maxW='768px'>
      {/* Hiển thị dòng thông báo nhỏ khi đang chọn collection */}
      {selectedCollection && (
        <Text fontSize="xs" color="blue.400" mb={1} ml={4} fontWeight="bold">
          Đang chat trong: {selectedCollection.name}
        </Text>
      )}

      <InputGroup
        w='full'
        startElement={
          <HStack gap={1} mr={1}>
            <PopoverRoot>
              <PopoverTrigger asChild>
                <IconButton
                  variant="ghost"
                  size="sm"
                  borderRadius="full"
                  aria-label="Select collection"
                  color="fg"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
                  // Allow pointer events so the button inside InputElement can be interactive
                  pointerEvents="auto"
                >
                  <PlusIcon />
                </IconButton>
              </PopoverTrigger>

              <PopoverContent bg="#2D2D2D" borderColor="whiteAlpha.200" zIndex={1500}>
                <PopoverBody p={0}>
                  <Box>
                    {isCollectionsLoading ? (
                      <Box px={3} py={2}>
                        <Text color="white">Đang tải...</Text>
                      </Box>
                    ) : collections.length === 0 ? (
                      <Box px={3} py={2}>
                        <Text color="white">Chưa có collection</Text>
                      </Box>
                    ) : (
                      <Box>
                        <Box px={3} py={2} _hover={{ bg: 'whiteAlpha.100' }} cursor="pointer" onClick={() => { setSelectedCollection(null); }}>
                          <Text color={!selectedCollection ? 'blue.300' : 'white'} fontWeight="bold">Tất cả (Mặc định)</Text>
                        </Box>
                        {collections.map((col) => (
                          <Box key={col.id} px={3} py={2} _hover={{ bg: 'whiteAlpha.100' }} cursor="pointer" onClick={() => { setSelectedCollection(col); }}>
                            <Text color={selectedCollection?.id === col.id ? 'blue.300' : 'white'}>{col.name}</Text>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </PopoverRoot>
            {/* === KẾT THÚC PHẦN SỬA === */}

            {/* file upload removed by user request */}
          </HStack>
        }
        endElement={
          <IconButton
            size='md'
            borderRadius='full'
            disabled={inputValue.trim() === ''}
            onClick={handleSendMessage}
            aria-label='Send message'
            bg={inputValue.trim() === '' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}
            _hover={{
              bg: inputValue.trim() === '' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
            }}
          >
            <EnterIcon fontSize='xl' />
          </IconButton>
        }
      >
        <Input
          placeholder={selectedCollection ? `Hỏi ${selectedCollection.name}...` : 'Message Askify'}
          variant='subtle'
          size='xl'
          h='14'
          pl="24"
          borderRadius='3xl'
          value={inputValue}
          onChange={handleInputValue}
          onKeyDown={handleKeyDown}
          borderWidth='1px'
          borderColor='rgba(255, 255, 255, 0.15)'
          _focus={{
            borderColor: 'rgba(255, 255, 255, 0.3)',
            boxShadow: 'none',
          }}
        />
      </InputGroup>
    </Box>
  );
}