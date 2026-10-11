const o=`
tbObj {
  u
  sm
  md
  ts
}
`,s=`
tbVars {
  u
  sm
  md
  ts
}
`,a=`
  ugcContributorStats {
    mediaEditReviewSubmitCount
    mediaEditApprovedCount
    mediaEditRejectedCount
    mediaEditAppliedCount
    mediaEditContributionPoints
    mediaEditModContributionPoints
  }
`,n=`
  _id
  username
  displayName
  createdAt
  picture
  reputation
  roleLevel

  `,r=`
  badgeUi {
    markKind
    tone
    shine
    shineRate
  }
`,d=`
  key
  name
  rank
  iconPath
  date
  ${r}
`,t=`
  ${n}
  brief
  followerCount
  followingCount
  pDec
  equippedBadgeKey
  equippedBadge {
    ${d}
  }
  personaTags
  ${a}
`,E=`
  ${t}
  hideMe
  clubHideProfileLink
  clubMemberRole
  clubJoinedDate

`,i=`
coverImg
description
contentFlags
`,c=`status {
  lastlogin {
    ipAddr
    date
  }
  country
  userAgent
  fromApp
  appVersion
  platform
  online
}
`,p=`
${E}
${i}
moderation
${c}

`,m=`
${t}
hideMe
${i}
moderation
`,e=`
  year
  month
  date
  hour
  minute
`,_=`
  slug
  rank
  spoiler
  ecchi
`,l=`
  tagMeta {
    ${_}
  }
`,u=`
  spoiler {
    mask
  }
`,D=`
  name
  englishName
  nativeName
  altNames
  spoilerNames
  description
  genres
  tags
  ${l}
  ${u}
  status
  type
  countryOfOrigin
  isAdult
  episodeCount
  chapterCount
  gender
  age
  bloodType
  heightCm
  weightKg
  dateBir {
    ${e}
  }
  quotes {
    text
    source
    spoiler
    ecchi
  }
  airedStart {
    ${e}
  }
  airedEnd {
    ${e}
  }
  prevideos
  baselineScreenshots
  baselineGallery {
    url
    poster
    mediaType
    contentType
    index
    animated
    tags
    tier
    artist
    colorist
    source
  }
  releaseYear
  developers
  publishers
  playerPerspectives
  mediaType
  storeLinks {
    label
    url
  }
  banner
  thumbnail
  thumbnails
  ${o}
  ${s}
`;export{r as D,d as E,E as F,D as M,o as T,t as U,c as a,p as b,m as c};
