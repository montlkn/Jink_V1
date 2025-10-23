// Classic-arch patch: hide Fabric-only Google Polygon view from classic builds
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
// Intentionally left empty in this patch to avoid compiling Fabric-only code.
// If you enable the new architecture (Fabric), remove this patch or
// replace with the full upstream implementation.
#endif

