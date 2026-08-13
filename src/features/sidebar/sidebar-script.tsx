export function SidebarScript({ code }: { code: string }) {
  return (
    <script
      data-bz-sidebar-script="true"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
