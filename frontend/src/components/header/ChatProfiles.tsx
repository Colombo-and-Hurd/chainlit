import { GptBadge, isLucideIconName } from '@/lib/featureVisuals';
import {
  clearPendingGptProfile,
  readPendingGptProfile
} from '@/lib/pendingGptProfile';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSetRecoilState } from 'recoil';

import {
  ChainlitContext,
  useChatInteract,
  useChatMessages,
  useChatSession,
  useConfig
} from '@chainlit/react-client';

import { Logo } from '@/components/Logo';
import { Markdown } from '@/components/Markdown';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { IAttachment, attachmentsState } from '@/state/chat';

import { NewChatDialog } from './NewChat';

interface Props {
  navigate?: (to: string) => void;
}

export default function ChatProfiles({ navigate }: Props) {
  const apiClient = useContext(ChainlitContext);
  const { config } = useConfig();
  const { chatProfile, setChatProfile } = useChatSession();
  const { firstInteraction } = useChatMessages();
  const { clear } = useChatInteract();
  const setAttachments = useSetRecoilState<IAttachment[]>(attachmentsState);
  const [newChatProfile, setNewChatProfile] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const pendingProfile = useMemo(() => readPendingGptProfile(), [chatProfile]);

  const profiles = useMemo(() => {
    const base = config?.chatProfiles || [];
    if (
      pendingProfile &&
      !base.some((profile) => profile.name === pendingProfile.name)
    ) {
      return [...base, pendingProfile];
    }
    return base;
  }, [config?.chatProfiles, pendingProfile]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.name === chatProfile) || null,
    [profiles, chatProfile]
  );

  useEffect(() => {
    if (!chatProfile && profiles.length) {
      setChatProfile(profiles[0].name);
    }
  }, [chatProfile, profiles, setChatProfile]);

  useEffect(() => {
    if (!chatProfile || !profiles.length) {
      return;
    }
    const profileExists = profiles.some(
      (profile) => profile.name === chatProfile
    );
    if (profileExists) {
      if (
        pendingProfile &&
        chatProfile === pendingProfile.name &&
        config?.chatProfiles?.some((profile) => profile.name === chatProfile)
      ) {
        clearPendingGptProfile();
      }
      return;
    }
    if (chatProfile.startsWith('gpt:')) {
      return;
    }
    setChatProfile(profiles[0].name);
  }, [
    chatProfile,
    config?.chatProfiles,
    pendingProfile,
    profiles,
    setChatProfile
  ]);

  if (!profiles.length || profiles.length <= 1) {
    return null;
  }

  const handleClose = () => {
    setOpenDialog(false);
    setNewChatProfile(null);
    navigate?.('/');
  };

  const handleConfirm = (profile: string) => {
    setChatProfile(profile);
    setNewChatProfile(null);
    setAttachments([]);
    clear();
    handleClose();
  };

  const allowHtml = config?.features?.unsafe_allow_html;
  const latex = config?.features?.latex;
  const displayLabel =
    selectedProfile?.display_name ||
    selectedProfile?.name ||
    pendingProfile?.display_name ||
    chatProfile ||
    'Select profile';

  return (
    <div className="relative">
      <Select
        value={chatProfile || ''}
        onValueChange={(value) => {
          setNewChatProfile(value);
          if (firstInteraction) {
            setOpenDialog(true);
          } else {
            handleConfirm(value);
          }
        }}
      >
        <SelectTrigger
          id="chat-profiles"
          className="w-fit border-none bg-transparent text-muted-foreground font-semibold text-lg hover:bg-accent"
        >
          <SelectValue placeholder="Select profile">{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => {
            const imageSrc = profile.icon?.includes('/public')
              ? apiClient.buildEndpoint(profile.icon)
              : profile.icon?.startsWith('http') ||
                  profile.icon?.startsWith('/')
                ? profile.icon
                : undefined;

            return (
              <HoverCard openDelay={0} closeDelay={0} key={profile.name}>
                <HoverCardTrigger asChild>
                  <SelectItem
                    data-test={`select-item:${profile.name}`}
                    value={profile.name}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isLucideIconName(profile.icon) ? (
                        <GptBadge
                          name={profile.icon}
                          className="h-7 w-7"
                          iconClassName="h-4 w-4"
                        />
                      ) : imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={profile.display_name || profile.name}
                          className="w-7 h-7 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
                          <Logo className="h-4 w-auto" />
                        </span>
                      )}
                      <span>{profile.display_name || profile.name}</span>
                    </div>
                  </SelectItem>
                </HoverCardTrigger>
                <HoverCardContent
                  side="right"
                  id="chat-profile-description"
                  align="start"
                  className="w-80 overflow-visible"
                  sideOffset={10}
                >
                  <Markdown
                    allowHtml={allowHtml}
                    latex={latex}
                    renderMarkdown={true}
                  >
                    {profile.markdown_description}
                  </Markdown>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </SelectContent>
      </Select>
      <NewChatDialog
        open={openDialog}
        handleClose={handleClose}
        handleConfirm={() => newChatProfile && handleConfirm(newChatProfile)}
      />
    </div>
  );
}
