import{E as y,D as n,F as t,b,M as l,c as g,a as N,T as q}from"./SO1vYemj.js";const z=`
  uploadId
  purpose
  status
  livePath
  liveUrl
  title
  badgeName
  frameGroup
  description
  frameRarity
  badgeRank
  scopeTitle
  achievementKey
  achievement {
    key
    label
    description
    badgeRank
    iconPath
    ${n}
    clauses {
      mode
      unlockMetric
      unlockThreshold
      unlockScopeMode
      anyOf {
        mode
        unlockMetric
        unlockThreshold
        unlockScopeMode
        unlockRefs {
          format
          id
          related {
            format
            title
            englishName
            name
          }
        }
        unlockRules {
          kind
          min
        }
      }
      unlockRefs {
        format
        id
        related {
          format
          title
          englishName
          name
        }
      }
      unlockRules {
        kind
        min
      }
    }
  }
  unlockMetric
  unlockThreshold
  unlockScopeMode
  unlockRefs {
    format
    id
    related {
      format
      title
      englishName
      name
    }
  }
  unlockRules {
    kind
    min
  }
`,st=`
query MyAvatarFrameUnlocks {
  myAvatarFrameUnlocks {
    uploadId
    purpose
    unlockedAt
    unlocked
    equipped
    asset {
      ${z}
    }
  }
}
`,dt=`
mutation EquipAvatarFrame($uploadId: String, $clear: Boolean) {
  equipAvatarFrame(uploadId: $uploadId, clear: $clear) {
    success
    message
    pDec
    livePath
    uploadId
  }
}
`,ot=`
mutation EquipBadge($key: String, $clear: Boolean) {
  equipBadge(key: $key, clear: $clear) {
    success
    message
    equippedBadgeKey
    equippedBadge {
      ${y}
    }
  }
}
`,rt=`
query MyBadgeUnlocks {
  myBadgeUnlocks {
    key
    label
    description
    badgeRank
    iconPath
    ${n}
    unlockedAt
    unlocked
    equipped
    achievement {
      key
      label
      description
      badgeRank
      iconPath
      ${n}
      clauses {
        mode
        unlockMetric
        unlockThreshold
        unlockScopeMode
        anyOf {
          mode
          unlockMetric
          unlockThreshold
          unlockScopeMode
          unlockRefs {
            format
            id
            related {
              format
              title
              englishName
              name
            }
          }
          unlockRules {
            kind
            min
          }
        }
        unlockRefs {
          format
          id
          related {
            format
            title
            englishName
            name
          }
        }
        unlockRules {
          kind
          min
        }
      }
    }
  }
}
`,nt=`
mutation SyncAvatarFrameUnlocks($format: String, $showId: String) {
  syncAvatarFrameUnlocks(format: $format, showId: $showId) {
    success
    message
    granted {
      uploadId
      purpose
      livePath
      badgeName
      frameRarity
      title
    }
    grantedAchievements {
      key
      label
      badgeRank
      iconPath
    }
    pDec
    decorationUnlocks {
      uploadId
      purpose
      unlockedAt
    }
    equippedBadgeKey
    equippedBadge {
      ${y}
    }
  }
}
`,B=`
mutation CreateUgcUploadUrl($purpose: UgcUploadPurpose!, $context: UgcUploadContextInput) {
  createUgcUploadUrl(purpose: $purpose, context: $context) {
    uploadId
    uploadUrl
    expiresAt
    maxBytes
    allowedMime
  }
}
`,O=`
mutation ConfirmUgcUpload(
  $uploadId: String!
  $width: Int
  $height: Int
  $bytesOptimized: Int
  $stagingPath: String
  $originalName: String
  $mime: String
) {
  confirmUgcUpload(
    uploadId: $uploadId
    width: $width
    height: $height
    bytesOptimized: $bytesOptimized
    stagingPath: $stagingPath
    originalName: $originalName
    mime: $mime
  ) {
    success
    message
    asset {
      uploadId
      purpose
      status
      stagingPath
      width
      height
      bytesOptimized
      previewUrl
    }
  }
}
`,x=`
mutation LinkUgcAsset(
  $uploadId: String!
  $moduleKind: String!
  $docId: String!
  $field: String!
) {
  linkUgcAsset(
    uploadId: $uploadId
    moduleKind: $moduleKind
    docId: $docId
    field: $field
  ) {
    success
    message
    asset {
      uploadId
      status
      previewUrl
    }
  }
}
`,gt=`
mutation SubmitWorldMapArtForReview($mapId: String!, $uploadId: String!) {
  submitWorldMapArtForReview(mapId: $mapId, uploadId: $uploadId) {
    success
    message
    worldMap {
      _id
      ugcArtReviewStatus
      artWorkflowStatus
      stagingUgcAssetId
      pendingBaseMapAssetId
      pendingArtPreviewUrl
      mapBounds {
        width
        height
      }
      canEdit
    }
  }
}
`,s=`
  uploadId
  purpose
  usageKind
  status
  liveUrl
  livePath
  previewUrl
  width
  height
  title
  scopeTitle
  scopeShowId
  scopeWorkId
  scopeFranchiseKey
`,d=`
  uploadId
  purpose
  usageKind
  status
  liveUrl
  livePath
  previewUrl
  width
  height
  title
  scopeTitle
  scopeShowId
  scopeWorkId
  scopeFranchiseKey
  targetType
  targetId
  source
  libraryVisibility
  usageRefCount
  unlockMetric
  unlockThreshold
  unlockRefId
  unlockRefFormat
  achievementKey
  unlockRefs {
    format
    id
  }
  unlockScopeMode
  unlockRules {
    kind
    min
  }
  frameRarity
  badgeName
  badgeRank
  frameGroup
  description
  creatorId
  creator {
    ${t}
  }
`,W=`
query PublicUgcAssets($search: UgcAssetSearch, $page: Int, $size: Int) {
  publicUgcAssets(search: $search, page: $page, size: $size) {
    edges {
      ${s}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,K=`
query MyUgcAssets($search: UgcAssetSearch, $page: Int, $size: Int) {
  myUgcAssets(search: $search, page: $page, size: $size) {
    edges {
      ${d}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,M=`
query UgcAsset($uploadId: String!) {
  ugcAsset(uploadId: $uploadId) {
    ${s}
    status
  }
}
`,U=`
query UgcAssetsWithIds($uploadIds: [String!]!) {
  ugcAssetsWithIds(uploadIds: $uploadIds) {
    ${s}
    status
  }
}
`,H=`
query UgcAssetPickerBundle(
  $publicSearch: UgcAssetSearch
  $mySearch: UgcAssetSearch
  $page: Int
  $size: Int
) {
  publicUgcAssets(search: $publicSearch, page: $page, size: $size) {
    edges {
      ${s}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
  myUgcAssets(search: $mySearch, page: $page, size: $size) {
    edges {
      ${s}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,V=`
mutation SubmitUgcAssetForReview(
  $uploadId: String!
  $tags: UgcAssetTagsInput
  $width: Int
  $height: Int
  $bytesOptimized: Int
  $stagingPath: String
  $originalName: String
  $mime: String
) {
  submitUgcAssetForReview(
    uploadId: $uploadId
    tags: $tags
    width: $width
    height: $height
    bytesOptimized: $bytesOptimized
    stagingPath: $stagingPath
    originalName: $originalName
    mime: $mime
  ) {
    success
    message
    asset {
      ${d}
    }
  }
}
`,j=`
mutation LinkWorldMapToUgcAsset($mapId: String!, $uploadId: String!) {
  linkWorldMapToUgcAsset(mapId: $mapId, uploadId: $uploadId) {
    success
    message
    worldMap {
      _id
      baseMapImage
      baseMapImageLive
      ugcArtLivePath
      ugcArtReviewStatus
      artWorkflowStatus
      baseMapLiveAssetId
      mapBounds {
        width
        height
      }
      canEdit
    }
  }
}
`,o=`
  uploadId
  purpose
  usageKind
  status
  previewUrl
  liveUrl
  livePath
  width
  height
  bytesOptimized
  title
  libraryVisibility
  usageRefCount
  achievementKey
  frameRarity
  badgeName
  badgeRank
  frameGroup
  description
  scopeTitle
  scopeShowId
  scopeWorkId
  scopeFranchiseKey
  creatorId
  creator {
    ${b}
  }
  creatorUploadStats {
    mintCount
    uploadCount
    bytesUploadedTotal
    stagingBytesPending
    submittedForReviewCount
    rejectedCount
    mintToUploadRatio
  }
`,k=`
query UgcLibraryModReviews(
  $page: Int
  $size: Int
  $filter: UgcLibraryModReviewFilter!
) {
  ugcLibraryModReviews(page: $page, size: $size, filter: $filter) {
    edges {
      ${o}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,T=`
query UgcLibraryModReviewsByPurpose(
  $page: Int
  $size: Int
  $filter: UgcLibraryModReviewFilter!
  $purpose: UgcUploadPurpose!
) {
  ugcLibraryModReviews(page: $page, size: $size, filter: $filter, purpose: $purpose) {
    edges {
      ${o}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,v=`
query PendingUgcLibraryReviews($page: Int, $size: Int) {
  pendingUgcLibraryReviews(page: $page, size: $size) {
    edges {
      ${o}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,w=`
mutation ReviewUgcAsset($uploadId: String!, $approve: Boolean!, $reviewNote: String) {
  reviewUgcAsset(uploadId: $uploadId, approve: $approve, reviewNote: $reviewNote) {
    success
    message
    asset {
      ${d}
    }
  }
}
`,E=`
mutation UnpublishUgcLibraryAsset($uploadId: String!, $reviewNote: String) {
  unpublishUgcLibraryAsset(uploadId: $uploadId, reviewNote: $reviewNote) {
    success
    message
    asset {
      ${d}
    }
  }
}
`,ct=Object.freeze(Object.defineProperty({__proto__:null,UGC_ASSET_LIBRARY_FIELDS:d,UGC_ASSET_MOD_REVIEW_FIELDS:o,UGC_ASSET_PICKER_FIELDS:s,mutationLinkWorldMapToUgcAsset:j,mutationReviewUgcAsset:w,mutationSubmitUgcAssetForReview:V,mutationUnpublishUgcLibraryAsset:E,queryMyUgcAssets:K,queryPendingUgcLibraryReviews:v,queryPublicUgcAssets:W,queryUgcAsset:M,queryUgcAssetPickerBundle:H,queryUgcAssetsWithIds:U,queryUgcLibraryModReviews:k,queryUgcLibraryModReviewsByPurpose:T},Symbol.toStringTag,{value:"Module"})),i=`
  _id
  moduleKind
  origin
  title
  summary
  creatorId
  targetType
  targetId
  scopeTitle
  workflowStatus
  privacy
  reviewedAt
  reviewNote
  appliedAt
  lastActionDate
  canEdit
  targetCard {
    _id
    title
    thumbnail
  }
  payload {
    schemaVersion
    editKind
    fieldPatches
    relationPatches
    art
    sources
    appliedFields
    appliedRelationKeys
  }
`,J=`
query MediaEditTargetBaseline($targetType: String!, $targetId: String!) {
  mediaEditTargetBaseline(targetType: $targetType, targetId: $targetId) {
${l}
  }
}
`,Y=`
query MediaEditEditorBootstrap($targetType: String!, $targetId: String!) {
  mediaEditEditorBootstrap(targetType: $targetType, targetId: $targetId) {
    suggestEditGate {
      allowed
      canEdit
      code
      message
    }
    baseline {
${l}
    }
    resumeSubmission {
      ${i}
    }
    stagingArtPreviews {
      uploadId
      previewUrl
    }
  }
}
`,f=`
query MediaEditSuggestEditGate($targetType: String!, $targetId: String!) {
  mediaEditSuggestEditGate(targetType: $targetType, targetId: $targetId) {
    allowed
    canEdit
    code
    message
  }
}
`,A=`
query MediaEditSuggestEditAvailability {
  mediaEditSuggestEditAvailability {
    anime { canEdit }
    manga { canEdit }
    character { canEdit }
    work { canEdit }
  }
}
`,lt=Object.freeze(Object.defineProperty({__proto__:null,queryMediaEditSuggestEditAvailability:A,queryMediaEditSuggestEditGate:f},Symbol.toStringTag,{value:"Module"})),P=`
query MediaEditCharacterVaSuggestions(
  $characterId: String!
  $excludePlayId: String
  $excludeFormat: String
  $limit: Int
) {
  mediaEditCharacterVaSuggestions(
    characterId: $characterId
    excludePlayId: $excludePlayId
    excludeFormat: $excludeFormat
    limit: $limit
  ) {
    staffId
    aniListId
    name
    language
    sourcePlayId
    sourceFormat
    sourceRole
    image
  }
}
`,ut=Object.freeze(Object.defineProperty({__proto__:null,queryMediaEditCharacterVaSuggestions:P},Symbol.toStringTag,{value:"Module"})),Q=`
query UgcSubmission($_id: String!) {
  ugcSubmission(_id: $_id) {
    ${i}
  }
}
`,X=`
query UgcSubmissions($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  ugcSubmissions(search: $search, page: $page, size: $size) {
    edges {
      ${i}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Z=`
query MyUgcSubmissions($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  myUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
      ${i}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,ee=`
mutation CreateUgcSubmission($input: CreateMediaEditInput!) {
  createUgcSubmission(input: $input) {
    success
    message
    submission {
      ${i}
    }
  }
}
`,te=`
mutation EditUgcSubmission($_id: String!, $input: EditMediaEditInput!) {
  editUgcSubmission(_id: $_id, input: $input) {
    success
    message
    submission {
      ${i}
    }
  }
}
`,ie=`
mutation SubmitUgcSubmissionForReview($_id: String!, $input: EditMediaEditInput) {
  submitUgcSubmissionForReview(_id: $_id, input: $input) {
    success
    message
    submissionId
    workflowStatus
    canEdit
  }
}
`,ae=`
mutation WithdrawUgcSubmission($_id: String!) {
  withdrawUgcSubmission(_id: $_id) {
    success
    message
    submissionId
    workflowStatus
    canEdit
  }
}
`,se=`
mutation CreateUgcSubmissionArtOnly($input: CreateMediaEditInput!) {
  createUgcSubmission(input: $input) {
    success
    message
    submissionId
  }
}
`,de=`
mutation EditUgcSubmissionArtOnly($_id: String!, $input: EditMediaEditInput!) {
  editUgcSubmission(_id: $_id, input: $input) {
    success
    message
    submissionId
  }
}
`,oe=`
mutation EditUgcSubmissionMetadataOnly($_id: String!, $input: EditMediaEditInput!) {
  editUgcSubmission(_id: $_id, input: $input) {
    success
    message
    submissionId
  }
}
`,pt=Object.freeze(Object.defineProperty({__proto__:null,UgcSubmissionBrowseFields:i,mutationConfirmUgcUpload:O,mutationCreateUgcSubmission:ee,mutationCreateUgcSubmissionArtOnly:se,mutationCreateUgcUploadUrl:B,mutationEditUgcSubmission:te,mutationEditUgcSubmissionArtOnly:de,mutationEditUgcSubmissionMetadataOnly:oe,mutationLinkUgcAsset:x,mutationSubmitUgcSubmissionForReview:ie,mutationWithdrawUgcSubmission:ae,queryMediaEditCharacterVaSuggestions:P,queryMediaEditEditorBootstrap:Y,queryMediaEditSuggestEditAvailability:A,queryMediaEditSuggestEditGate:f,queryMediaEditTargetBaseline:J,queryMyUgcSubmissions:Z,queryUgcAsset:M,queryUgcAssetsWithIds:U,queryUgcSubmission:Q,queryUgcSubmissions:X},Symbol.toStringTag,{value:"Module"})),_=`
  key
  label
  description
  badgeRank
  iconPath
  ${n}
  enabled
  hasBadgeIcon
  linkedFrameCount
  clauses {
    mode
    unlockMetric
    unlockThreshold
    unlockScopeMode
    anyOf {
      mode
      unlockMetric
      unlockThreshold
      unlockScopeMode
      unlockRefs {
        format
        id
      }
      unlockRules {
        kind
        min
      }
    }
    unlockRefs {
      format
      id
    }
    unlockRules {
      kind
      min
    }
  }
`,mt=`
query DecorationAchievements($enabledOnly: Boolean) {
  decorationAchievements(enabledOnly: $enabledOnly) {
    ${_}
  }
}
`,$t=`
mutation UpsertDecorationAchievement($input: UpsertDecorationAchievementInput!) {
  upsertDecorationAchievement(input: $input) {
    success
    message
    achievement {
      ${_}
    }
  }
}
`,C=`
      _id
      moduleKind
      origin
      title
      targetType
      targetId
      scopeTitle
      workflowStatus
      creatorId
      lastActionDate
      mediaEditFieldPatchKeys
      mediaEditArtSlots
      mediaEditModArtPreviews {
        uploadId
        slot
        previewUrl
        galleryIndex
        galleryTotal
        tags
      }
      mediaEditModChangeLines {
        kind
        changeAction
        label
        fromText
        toText
        textDiffBefore
        textDiffAfter
        artSlot
        previewUrl
        galleryIndex
        galleryTotal
        fromTags
        toTags
      }
      mediaEditModRelationPreviews {
        kind
        changeAction
        refId
        characterId
        playId
        format
        relation
        role
        title
        thumbnail
      }
      mediaEditModValidationHints {
        field
        severity
        code
        message
        values
      }
      mediaEditTargetMergeBlock {
        blocked
        blockingSubmissionId
        blockingWorkflowStatus
        message
      }
      reviewSubmitCount
      mediaEditCreatorStats {
        reviewSubmitCount
        pendingCount
        approvedCount
        rejectedCount
      }
      linkedProviderIds {
        malId
        aniListId
      }
      sourceReviewHints {
        label
        url
        provider
        parsedId
        matchStatus
        hint
      }
      targetCard {
        _id
        title
        thumbnail
      }`,re=`
query PendingUgcSubmissions($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  pendingUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
${C}
      creator {
        ${g}
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,ne=`
      _id
      moduleKind
      origin
      title
      targetType
      targetId
      scopeTitle
      workflowStatus
      creatorId
      lastActionDate
      reviewedAt
      reviewNote
      appliedAt
      reviewSubmitCount
      mediaEditFieldPatchKeys
      mediaEditArtSlots
      mediaEditModChangeLines {
        kind
        changeAction
        label
      }
      targetCard {
        _id
        title
        thumbnail
      }`,ge=`
query ModUgcSubmissions($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  modUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
${ne}
      creator {
        ${g}
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,ce=`
query PendingUgcSubmissionsAdmin($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  pendingUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
${C}
      creator {
        ${g}
        ${N}
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,R=`
  mapId
  title
  creatorId
  creator {
    ${b}
  }
  scopeTitle
  scopeShowId
  scopeWorkId
  uploadId
  previewUrl
  liveArtPath
  width
  height
  purpose
  reviewStatus
  lastActionDate
`,le=`
query PendingWorldMapArtReviews($page: Int, $size: Int) {
  pendingWorldMapArtReviews(page: $page, size: $size) {
    edges {
      ${R}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,ue=`
query WorldMapArtModReviews($page: Int, $size: Int, $filter: WorldMapArtModReviewFilter!) {
  worldMapArtModReviews(page: $page, size: $size, filter: $filter) {
    edges {
      ${R}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,pe=`
mutation ReviewWorldMapArt(
  $mapId: String!
  $uploadId: String!
  $approve: Boolean!
  $reviewNote: String
) {
  reviewWorldMapArt(
    mapId: $mapId
    uploadId: $uploadId
    approve: $approve
    reviewNote: $reviewNote
  ) {
    success
    message
    worldMap {
      _id
      artWorkflowStatus
      baseMapImageLive
    }
  }
}
`,me=`
query MediaEditModReviewSubmission($_id: String!, $targetType: String!, $targetId: String!) {
  ugcSubmission(_id: $_id) {
    ${i}
    linkedProviderIds {
      malId
      aniListId
    }
    sourceReviewHints {
      label
      url
      provider
      parsedId
      matchStatus
      hint
    }
    mediaEditModArtPreviews {
      uploadId
      slot
      previewUrl
      galleryIndex
      galleryTotal
      tags
    }
      mediaEditModChangeLines {
        kind
        changeAction
        label
        fromText
        toText
        textDiffBefore
        textDiffAfter
        artSlot
        previewUrl
        galleryIndex
        galleryTotal
        fromTags
        toTags
      }
      mediaEditModRelationPreviews {
        kind
        changeAction
        refId
        characterId
        playId
        format
        relation
        role
        title
        thumbnail
      }
      mediaEditModValidationHints {
      field
      severity
      code
      message
      values
    }
    mediaEditTargetMergeBlock {
      blocked
      blockingSubmissionId
      blockingWorkflowStatus
      message
    }
    creator {
      ${g}
    }
  }
  mediaEditTargetBaseline(targetType: $targetType, targetId: $targetId) {
    ${l}
  }
}
`,$e=`
      _id
      moduleKind
      targetType
      targetId
      scopeTitle
      workflowStatus
      lastActionDate
      applyPromoteStatus
      lastApplyError
      lastApplyPhase
      targetCard {
        _id
        title
        thumbnail
      }`,Ie=`
query FailedUgcSubmissions($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  failedUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
${$e}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,he=`
mutation RetryUgcSubmissionApply($_id: String!) {
  retryUgcSubmissionApply(_id: $_id) {
    success
    message
    submission {
      _id
      workflowStatus
    }
  }
}
`,Se=`
mutation ReviewUgcSubmission(
  $_id: String!
  $approve: Boolean!
  $reviewNote: String
  $proposedAction: String
  $candidateIndex: Int
  $candidateId: String
) {
  reviewUgcSubmission(
    _id: $_id
    approve: $approve
    reviewNote: $reviewNote
    proposedAction: $proposedAction
    candidateIndex: $candidateIndex
    candidateId: $candidateId
  ) {
    success
    message
    submission {
      _id
      workflowStatus
      reviewedAt
      reviewNote
    }
  }
}
`,ye=`
query PendingScraperReviews($search: UgcSubmissionSearch!, $page: Int, $size: Int) {
  pendingUgcSubmissions(search: $search, page: $page, size: $size) {
    edges {
      _id
      moduleKind
      origin
      title
      summary
      targetType
      targetId
      scopeTitle
      workflowStatus
      lastActionDate
      payload {
        proposedAction
        reviewReason
        mudaeName
        dbCandidateName
        mudaeId
        playId
        format
        stagingEntityId
        stagingRef
      }
      targetCard {
        _id
        title
        thumbnail
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,be=`
mutation DiscardUgcSubmission($_id: String!) {
  discardUgcSubmission(_id: $_id) {
    success
    message
    submissionId
  }
}
`,It=Object.freeze(Object.defineProperty({__proto__:null,UGC_ASSET_MOD_REVIEW_FIELDS:o,mutationDiscardUgcSubmission:be,mutationRetryUgcSubmissionApply:he,mutationReviewUgcAsset:w,mutationReviewUgcSubmission:Se,mutationReviewWorldMapArt:pe,mutationUnpublishUgcLibraryAsset:E,queryFailedUgcSubmissions:Ie,queryMediaEditModReviewSubmission:me,queryModUgcSubmissions:ge,queryPendingScraperReviews:ye,queryPendingUgcLibraryReviews:v,queryPendingUgcSubmissions:re,queryPendingUgcSubmissionsAdmin:ce,queryPendingWorldMapArtReviews:le,queryUgcLibraryModReviews:k,queryUgcLibraryModReviewsByPurpose:T,queryWorldMapArtModReviews:ue},Symbol.toStringTag,{value:"Module"})),u=`
  _id
  title
  description
  privacy
  creatorId
  options {
    _id
    label
    voteCount
  }
  allowMultiple
  closed
  isClosed
  closesAt
  voterCount
  views
  likesCount
  lastActionDate
  createdDate
  canEdit
  canVote
  myVote {
    pollId
    userId
    optionIds
    addedDate
    updatedDate
  }
`,r=`
  ${u}
  creator {
    ${t}
  }
`,Me=`
query Poll($pollId: String!, $threadId: String) {
  poll(pollId: $pollId, threadId: $threadId) {
    ${r}
  }
}
`,Ue=`
mutation CreatePoll(
  $title: String!
  $description: String
  $options: [String!]!
  $allowMultiple: Boolean
  $privacy: VaildPrivacyEnumType
  $closesAt: DateTime
) {
  createPoll(
    title: $title
    description: $description
    options: $options
    allowMultiple: $allowMultiple
    privacy: $privacy
    closesAt: $closesAt
  ) {
    success
    message
    poll {
      ${r}
    }
  }
}
`,ke=`
mutation VotePoll($pollId: String!, $optionIds: [String!]!, $threadId: String) {
  votePoll(pollId: $pollId, optionIds: $optionIds, threadId: $threadId) {
    success
    message
    poll {
      ${r}
    }
  }
}
`,Te=`
mutation ClosePoll($pollId: String!) {
  closePoll(pollId: $pollId) {
    success
    message
    poll {
      ${r}
    }
  }
}
`,ht=Object.freeze(Object.defineProperty({__proto__:null,POLL_CARD_FIELDS:u,POLL_FIELDS:r,mutationClosePoll:Te,mutationCreatePoll:Ue,mutationVotePoll:ke,queryPoll:Me},Symbol.toStringTag,{value:"Module"})),p=`
  _id
  format
  title
  name
  englishName
  cover
  ${q}
  isPrimary
`,G=`
  editScopeType
  editScopeLinks
  editScopeTitle
  editTitle
  editLayoutTheme
  editCoverEnabled
  accentColorEnabled
  scopeUnlockAt
`,m=`
  _id
  title
  brief
  welcomeMessage
  description
  privacy
  creatorId
  scopeType
  scopeShowId
  scopeMangaId
  scopeWorkId
  scopeCharacterId
  scopeFranchiseKey
  scopeTitle
  relatedShowIds
  relatedMangaIds
  relatedWorkIds
  relatedCharacterIds
  layoutTheme
  contentFlags
  themeConfig {
    accent
    accentSoft
    bannerUrl
    bannerLiveAssetId
    linkedMapId
    roleLabels {
      owner
      mod
      member
    }
  }
  settings {
    wallEnabled
  }
  memberCount
  threadCount
  commentCount
  views
  likesCount
  lastActionDate
  createdDate
  tags
`,D=`
  ${m}
  creator {
    ${t}
  }
`,e=`
  ${D}
  slug
  editors
  themeConfig {
    accent
    accentSoft
    bannerUrl
    bannerLiveAssetId
    linkedMapId
    roleLabels {
      owner
      mod
      member
    }
  }
  pinnedThreadIds
  pinnedThreads {
    _id
    title
    kind
    replyCount
    lastActionDate
    creatorId
    creator {
      ${t}
    }
  }
  memberCount
  canEdit
  canJoin
  canPost
  editPolicy {
    ${G}
  }
  isMember
  isSubscribed
  hasPendingInvite
  myRole
  members {
    userId
    role
    joinedDate
    displayName
    hideProfileLink
    user {
      ${t}
    }
  }
  pendingInvites {
    userId
    invitedBy
    createdDate
    user {
      ${t}
    }
  }
  attachments {
    kind
    refId
    label
    sortOrder
  }
`,c=`
  _id
  memberCount
  lastActionDate
  canEdit
  canJoin
  canPost
  isMember
  isSubscribed
  hasPendingInvite
  myRole
`,$=`
  _id
  title
  brief
  containerKind
  boardSortOrder
  threadCount
  lastActionDate
  staffPostOnly
  creatorDisplayName
`,I=`
  kind
  refId
  label
  sortOrder
`,L=`
  kind
  refId
  title
  format
  cover
  itemCount
  privacy
  voteCount
  sampleCovers
`,ve=`
  views
  likesCount
  dislikesCount
  boostsCount
  commentCount
  reviewCount
  userScoreCount
  userScoreAverValue
  userScoreTotalValue
`,a=`
  _id
  guideId
  creatorId
  creator {
    ${t}
  }
  kind
  title
  excerpt
  cardImageUrl
  cardMediaMarkdown
  postImagePath
  pinned
  locked
  hidden
  deleteFlag
  canEdit
  canModerate
  editPolicy {
    editKind
    editAttachments
    editMediaLinks
  }
  replyCount
  lastReplyDate
  lastReplyUserId
  lastActionDate
  createdDate
  contentLen
  scopeShowId
  scopeMangaId
  scopeWorkId
  scopeCharacterId
  relatedShowIds
  relatedMangaIds
  relatedWorkIds
  relatedCharacterIds
  guide {
    _id
    title
    containerKind
    creatorId
    layoutTheme
    themeConfig {
      roleLabels {
        owner
        mod
        member
      }
    }
  }
  attachments {
    ${I}
  }
  forumAudience
  ${ve}
`,h=`
  ${a}
  content
  lastEditedDate
  canPost
  isSubscribed
  relatedMedia {
    ${p}
  }
  attachmentPreviews {
    ${L}
  }
  attachedPoll {
    ${u}
  }
`,S=`
  _id
  guideId
  kind
  title
  content
  contentLen
  excerpt
  cardImageUrl
  cardMediaMarkdown
  postImagePath
  pinned
  locked
  hidden
  deleteFlag
  replyCount
  lastReplyDate
  lastReplyUserId
  lastActionDate
  createdDate
  lastEditedDate
  scopeShowId
  scopeMangaId
  scopeWorkId
  scopeCharacterId
  relatedShowIds
  relatedMangaIds
  relatedWorkIds
  relatedCharacterIds
  attachments {
    ${I}
  }
  canEdit
  canModerate
  editPolicy {
    editKind
    editAttachments
    editMediaLinks
  }
  canPost
  relatedMedia {
    ${p}
  }
`,we=`
mutation ModerateGuideThreadByStaff($threadId: String!, $hidden: Boolean!, $reason: String) {
  moderateGuideThreadByStaff(threadId: $threadId, hidden: $hidden, reason: $reason) {
    success
    message
    thread {
      ${S}
    }
  }
}
`,Ee=`
mutation ModerateGuideCommentByStaff($commentId: String!, $hidden: Boolean!, $reason: String) {
  moderateGuideCommentByStaff(commentId: $commentId, hidden: $hidden, reason: $reason) {
    success
    message
  }
}
`,fe=`
query GuideMembers($guideId: String!, $page: Int, $size: Int) {
  guideMembers(guideId: $guideId, page: $page, size: $size) {
    edges {
      userId
      role
      joinedDate
      displayName
      hideProfileLink
      user {
        ${t}
      }
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Ae=`
query Guides($search: GuideSearch!, $page: Int, $size: Int) {
  guides(search: $search, page: $page, size: $size) {
    edges {
      ${m}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Pe=`
query GuideCommunity($guideId: String!) {
  guideCommunity(guideId: $guideId) {
    ${e}
  }
}
`,_e=`
query ForumBoard($guideId: String!) {
  guideCommunity(guideId: $guideId) {
    ${$}
  }
}
`,Ce=`
query SiteForumBoardCatalog($page: Int, $size: Int) {
  siteForumBoardCatalog(page: $page, size: $size) {
    edges {
      ${$}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Re=`
query SiteForumThreads($boardId: String, $page: Int, $size: Int, $sortBy: SortByForumThreads, $query: String, $followingOnly: Boolean, $subscribedOnly: Boolean, $pinnedOnly: Boolean) {
  siteForumThreads(boardId: $boardId, page: $page, size: $size, sortBy: $sortBy, query: $query, followingOnly: $followingOnly, subscribedOnly: $subscribedOnly, pinnedOnly: $pinnedOnly) {
    edges {
      ${a}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Ge=`
query UserGuideThreads($creatorId: String!, $page: Int, $size: Int) {
  userGuideThreads(creatorId: $creatorId, page: $page, size: $size) {
    edges {
      ${a}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,De=`
query GuideThreads($guideId: String!, $page: Int, $size: Int, $kind: GuideThreadKind) {
  guideThreads(guideId: $guideId, page: $page, size: $size, kind: $kind) {
    edges {
      ${a}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Le=`
query GuideThreadsForMedia(
  $scopeShowId: String
  $scopeMangaId: String
  $scopeWorkId: String
  $scopeCharacterId: String
  $scopeType: GuideScopeType
  $page: Int
  $size: Int
) {
  guideThreadsForMedia(
    scopeShowId: $scopeShowId
    scopeMangaId: $scopeMangaId
    scopeWorkId: $scopeWorkId
    scopeCharacterId: $scopeCharacterId
    scopeType: $scopeType
    page: $page
    size: $size
  ) {
    edges {
      ${a}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,F=`
  _id
  guideId
  kind
  title
  pinned
  replyCount
  lastReplyDate
  lastActionDate
  createdDate
`,Fe=`
query GuideThreadsForHome($scopeType: GuideScopeType!, $page: Int, $size: Int) {
  guideThreadsForMedia(scopeType: $scopeType, page: $page, size: $size) {
    edges {
      ${F}
    }
    pageInfo {
      total
      hasNextPage
      nextPage
      limit
    }
  }
}
`,Ne=`
query GuideThread($threadId: String!, $replyPage: Int, $replySize: Int) {
  guideThread(threadId: $threadId, replyPage: $replyPage, replySize: $replySize) {
    ${h}
  }
}
`,qe=`
mutation CreateGuideCommunity(
  $title: String!
  $brief: String
  $welcomeMessage: String
  $description: String
  $privacy: VaildPrivacyEnumType
  $layoutTheme: GuideLayoutTheme
  $themeConfig: GuideThemeConfigInput
  $scopeType: GuideScopeType
  $scopeShowId: String
  $scopeMangaId: String
  $scopeWorkId: String
  $scopeCharacterId: String
  $scopeFranchiseKey: String
  $scopeTitle: String
  $relatedShowIds: [String]
  $relatedMangaIds: [String]
  $relatedWorkIds: [String]
  $relatedCharacterIds: [String]
  $tags: [String]
  $displayName: String
  $hideProfileLink: Boolean
  $settings: GuideSettingsInput
) {
  createGuideCommunity(
    title: $title
    brief: $brief
    welcomeMessage: $welcomeMessage
    description: $description
    privacy: $privacy
    layoutTheme: $layoutTheme
    themeConfig: $themeConfig
    scopeType: $scopeType
    scopeShowId: $scopeShowId
    scopeMangaId: $scopeMangaId
    scopeWorkId: $scopeWorkId
    scopeCharacterId: $scopeCharacterId
    scopeFranchiseKey: $scopeFranchiseKey
    scopeTitle: $scopeTitle
    relatedShowIds: $relatedShowIds
    relatedMangaIds: $relatedMangaIds
    relatedWorkIds: $relatedWorkIds
    relatedCharacterIds: $relatedCharacterIds
    tags: $tags
    displayName: $displayName
    hideProfileLink: $hideProfileLink
    settings: $settings
  ) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,ze=`
mutation JoinGuideCommunity($guideId: String!, $displayName: String, $hideProfileLink: Boolean) {
  joinGuideCommunity(guideId: $guideId, displayName: $displayName, hideProfileLink: $hideProfileLink) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,Be=`
mutation LeaveGuideCommunity($guideId: String!) {
  leaveGuideCommunity(guideId: $guideId) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,Oe=`
mutation AcceptGuideInvite($guideId: String!, $displayName: String, $hideProfileLink: Boolean) {
  acceptGuideInvite(guideId: $guideId, displayName: $displayName, hideProfileLink: $hideProfileLink) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,xe=`
mutation DeclineGuideInvite($guideId: String!) {
  declineGuideInvite(guideId: $guideId) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,We=`
mutation CreateGuideThread(
  $guideId: String!
  $title: String!
  $content: String!
  $kind: GuideThreadKind
  $attachments: [GuideAttachmentInput!]
  $publishTo: ForumPublishTo
  $scopeShowId: String
  $scopeMangaId: String
  $scopeWorkId: String
  $scopeCharacterId: String
  $relatedShowIds: [String]
  $relatedMangaIds: [String]
  $relatedWorkIds: [String]
  $relatedCharacterIds: [String]
  $postImageUploadId: String
  $postImageWidth: Int
  $postImageHeight: Int
  $postImageBytes: Int
  $postImageStagingPath: String
  $postImageOriginalName: String
  $postImageMime: String
) {
  createGuideThread(
    guideId: $guideId
    title: $title
    content: $content
    kind: $kind
    attachments: $attachments
    publishTo: $publishTo
    scopeShowId: $scopeShowId
    scopeMangaId: $scopeMangaId
    scopeWorkId: $scopeWorkId
    scopeCharacterId: $scopeCharacterId
    relatedShowIds: $relatedShowIds
    relatedMangaIds: $relatedMangaIds
    relatedWorkIds: $relatedWorkIds
    relatedCharacterIds: $relatedCharacterIds
    postImageUploadId: $postImageUploadId
    postImageWidth: $postImageWidth
    postImageHeight: $postImageHeight
    postImageBytes: $postImageBytes
    postImageStagingPath: $postImageStagingPath
    postImageOriginalName: $postImageOriginalName
    postImageMime: $postImageMime
  ) {
    success
    message
    thread {
      ${h}
    }
    guide {
      _id
      threadCount
      pinnedThreadIds
    }
  }
}
`,Ke=`
mutation EditGuideCommunity(
  $guideId: String!
  $title: String
  $brief: String
  $welcomeMessage: String
  $description: String
  $privacy: VaildPrivacyEnumType
  $layoutTheme: GuideLayoutTheme
  $themeConfig: GuideThemeConfigInput
  $settings: GuideSettingsInput
  $scopeType: GuideScopeType
  $scopeShowId: String
  $scopeMangaId: String
  $scopeWorkId: String
  $scopeCharacterId: String
  $scopeFranchiseKey: String
  $scopeTitle: String
  $relatedShowIds: [String]
  $relatedMangaIds: [String]
  $relatedWorkIds: [String]
  $relatedCharacterIds: [String]
  $tags: [String]
) {
  editGuideCommunity(
    guideId: $guideId
    title: $title
    brief: $brief
    welcomeMessage: $welcomeMessage
    description: $description
    privacy: $privacy
    layoutTheme: $layoutTheme
    themeConfig: $themeConfig
    settings: $settings
    scopeType: $scopeType
    scopeShowId: $scopeShowId
    scopeMangaId: $scopeMangaId
    scopeWorkId: $scopeWorkId
    scopeCharacterId: $scopeCharacterId
    scopeFranchiseKey: $scopeFranchiseKey
    scopeTitle: $scopeTitle
    relatedShowIds: $relatedShowIds
    relatedMangaIds: $relatedMangaIds
    relatedWorkIds: $relatedWorkIds
    relatedCharacterIds: $relatedCharacterIds
    tags: $tags
  ) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,He=`
mutation ApplyGuideBannerUpload(
  $guideId: String!
  $uploadId: String!
  $width: Int
  $height: Int
  $bytesOptimized: Int
  $stagingPath: String
  $originalName: String
  $mime: String
) {
  applyGuideBannerUpload(
    guideId: $guideId
    uploadId: $uploadId
    width: $width
    height: $height
    bytesOptimized: $bytesOptimized
    stagingPath: $stagingPath
    originalName: $originalName
    mime: $mime
  ) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,Ve=`
mutation InviteToGuide($guideId: String!, $userId: String!) {
  inviteToGuide(guideId: $guideId, userId: $userId) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,je=`
mutation KickGuideMember($guideId: String!, $userId: String!) {
  kickGuideMember(guideId: $guideId, userId: $userId) {
    success
    message
    guide {
      ${c}
    }
  }
}
`,Je=`
mutation SetGuideMemberRole($guideId: String!, $userId: String!, $role: GuideMemberRole!) {
  setGuideMemberRole(guideId: $guideId, userId: $userId, role: $role) {
    success
    message
    guide {
      ${c}
    }
  }
}
`,Ye=`
mutation SetGuideMemberRoles(
  $guideId: String!
  $updates: [GuideMemberRoleUpdateInput!]
  $removeUserIds: [String!]
) {
  setGuideMemberRoles(guideId: $guideId, updates: $updates, removeUserIds: $removeUserIds) {
    success
    message
    guide {
      ${c}
    }
  }
}
`,Qe=`
mutation UpdateGuideMemberDisplayName($guideId: String!, $displayName: String) {
  updateGuideMemberDisplayName(guideId: $guideId, displayName: $displayName) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,Xe=`
mutation UpdateGuideMemberHideProfileLink($guideId: String!, $hideProfileLink: Boolean!) {
  updateGuideMemberHideProfileLink(guideId: $guideId, hideProfileLink: $hideProfileLink) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,Ze=`
mutation EditGuideThread(
  $threadId: String!
  $title: String
  $content: String
  $kind: GuideThreadKind
  $locked: Boolean
  $attachments: [GuideAttachmentInput!]
  $scopeShowId: String
  $scopeMangaId: String
  $scopeWorkId: String
  $scopeCharacterId: String
  $relatedShowIds: [String]
  $relatedMangaIds: [String]
  $relatedWorkIds: [String]
  $relatedCharacterIds: [String]
  $postImageUploadId: String
  $postImageWidth: Int
  $postImageHeight: Int
  $postImageBytes: Int
  $postImageStagingPath: String
  $postImageOriginalName: String
  $postImageMime: String
  $clearPostImage: Boolean
) {
  editGuideThread(
    threadId: $threadId
    title: $title
    content: $content
    kind: $kind
    locked: $locked
    attachments: $attachments
    scopeShowId: $scopeShowId
    scopeMangaId: $scopeMangaId
    scopeWorkId: $scopeWorkId
    scopeCharacterId: $scopeCharacterId
    relatedShowIds: $relatedShowIds
    relatedMangaIds: $relatedMangaIds
    relatedWorkIds: $relatedWorkIds
    relatedCharacterIds: $relatedCharacterIds
    postImageUploadId: $postImageUploadId
    postImageWidth: $postImageWidth
    postImageHeight: $postImageHeight
    postImageBytes: $postImageBytes
    postImageStagingPath: $postImageStagingPath
    postImageOriginalName: $postImageOriginalName
    postImageMime: $postImageMime
    clearPostImage: $clearPostImage
  ) {
    success
    message
    thread {
      ${S}
    }
  }
}
`,et=`
mutation PinGuideThread($guideId: String!, $threadId: String!, $pinned: Boolean!) {
  pinGuideThread(guideId: $guideId, threadId: $threadId, pinned: $pinned) {
    success
    message
    thread {
      ${a}
    }
    guide {
      _id
      pinnedThreadIds
      threadCount
    }
  }
}
`,tt=`
mutation SetGuideAttachments($guideId: String!, $attachments: [GuideAttachmentInput!]!) {
  setGuideAttachments(guideId: $guideId, attachments: $attachments) {
    success
    message
    guide {
      ${e}
    }
  }
}
`,it=`
mutation ToggleGuideSubscribe(
  $targetType: GuideSubscribeTarget!
  $targetId: String!
  $subscribed: Boolean!
) {
  toggleGuideSubscribe(
    targetType: $targetType
    targetId: $targetId
    subscribed: $subscribed
  ) {
    success
    message
    subscribed
    targetType
    targetId
  }
}
`,St=Object.freeze(Object.defineProperty({__proto__:null,FORUM_BOARD_SHELL_FIELDS:$,GUIDE_ACTION_PATCH_FIELDS:c,GUIDE_BROWSE_FIELDS:D,GUIDE_BROWSE_LIST_FIELDS:m,GUIDE_CLUB_EDIT_POLICY_FIELDS:G,GUIDE_RELATED_MEDIA_FIELDS:p,GUIDE_SHELL_FIELDS:e,GUIDE_THREAD_ATTACHMENT_FIELDS:I,GUIDE_THREAD_ATTACHMENT_PREVIEW_FIELDS:L,GUIDE_THREAD_BROWSE_FIELDS:a,GUIDE_THREAD_DETAIL_FIELDS:h,GUIDE_THREAD_HOME_FIELDS:F,GUIDE_THREAD_MUTATION_FIELDS:S,mutationAcceptGuideInvite:Oe,mutationApplyGuideBannerUpload:He,mutationCreateGuideCommunity:qe,mutationCreateGuideThread:We,mutationDeclineGuideInvite:xe,mutationEditGuideCommunity:Ke,mutationEditGuideThread:Ze,mutationInviteToGuide:Ve,mutationJoinGuideCommunity:ze,mutationKickGuideMember:je,mutationLeaveGuideCommunity:Be,mutationModerateGuideCommentByStaff:Ee,mutationModerateGuideThreadByStaff:we,mutationPinGuideThread:et,mutationSetGuideAttachments:tt,mutationSetGuideMemberRole:Je,mutationSetGuideMemberRoles:Ye,mutationToggleGuideSubscribe:it,mutationUpdateGuideMemberDisplayName:Qe,mutationUpdateGuideMemberHideProfileLink:Xe,queryForumBoard:_e,queryGuideCommunity:Pe,queryGuideMembers:fe,queryGuideThread:Ne,queryGuideThreads:De,queryGuideThreadsForHome:Fe,queryGuideThreadsForMedia:Le,queryGuides:Ae,querySiteForumBoardCatalog:Ce,querySiteForumThreads:Re,queryUserGuideThreads:Ge},Symbol.toStringTag,{value:"Module"}));export{lt as a,ut as b,O as c,B as d,dt as e,ot as f,St as g,x as h,gt as i,nt as j,$t as k,st as l,pt as m,rt as n,It as o,ht as p,mt as q,ct as u};
