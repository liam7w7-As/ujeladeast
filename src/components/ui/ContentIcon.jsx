import { AlertCircle, BookOpen, ChevronDown, Church, ClipboardList, Clock, Download, ExternalLink, Eye, FileArchive, FileText, FolderOpen, Grid2X2, Image, Info, List, LoaderCircle, MapPin, Maximize2, Mic, Minimize2, Music2, Music4, Paperclip, Presentation, Search, Table2, UserRound, Video, X } from 'lucide-react';

const icons = {
  apps: Grid2X2, assignment: ClipboardList, attach_file: Paperclip, church: Church,
  close: X, co_present: Presentation, description: FileText, download: Download,
  error: AlertCircle, expand_more: ChevronDown, folder_open: FolderOpen,
  folder_zip: FileArchive, fullscreen: Maximize2, fullscreen_exit: Minimize2,
  grid_view: Grid2X2, image: Image, info: Info, location_on: MapPin,
  menu_book: BookOpen, music_note: Music2, music_off: Music4, open_in_new: ExternalLink,
  person: UserRound, picture_as_pdf: FileText, progress_activity: LoaderCircle,
  record_voice_over: Mic, schedule: Clock, search: Search, smart_display: Video,
  table_chart: Table2, view_list: List, visibility: Eye,
};

// Content records still use legacy icon names; render them without a font request.
export default function ContentIcon({ name, className = '' }) {
  const Icon = icons[name] || FileText;
  return <Icon size="1em" aria-hidden="true" className={`inline-block shrink-0 align-middle ${className}`} />;
}
