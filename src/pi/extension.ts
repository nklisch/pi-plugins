import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createPackagedPluginHost } from "../composition/create-packaged-plugin-host.js";
import { createPiControlChannel } from "./pi-control-channel.js";
import { createPluginCommandAdapter } from "./plugin-command.js";
import { createPluginManagerLifecycle } from "./plugin-manager-lifecycle.js";
import { createPiManagerReloadHandoff } from "./pi-manager-reload-handoff.js";
import { createPiUpdateNotificationPublisher } from "./pi-update-notification-publisher.js";
import { createPiControlInputPort } from "./manager/pi-control-input.js";
import { createPluginManagerSession } from "./manager/plugin-manager-session.js";

/** Construct-only Pi extension entry; host startup remains session_start-owned. */
export default function packagedPluginHostExtension(pi: ExtensionAPI): void {
  const publisher = createPiUpdateNotificationPublisher({ pi });
  // Host construction registers its lifecycle delegates first. Presentation is
  // registered below so startup/shutdown ordering remains host → UI.
  const host = createPackagedPluginHost({ pi, update: { publisher } });
  const handoff = createPiManagerReloadHandoff();
  const manager = createPluginManagerSession({ host, handoff });
  const command = createPluginCommandAdapter({
    pi,
    host,
    manager,
    channel: createPiControlChannel({ pi }),
    handoff,
    createInput: (context, mode) => createPiControlInputPort({ context, mode }),
  });
  command.register();
  createPluginManagerLifecycle({ pi, publisher, manager, command, handoff }).register();
}
