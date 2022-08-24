const classes = (() => {
  const cl = WH.Wow.PlayerClass;
  return cl.getAll().map(c => ({
    id: c,
    icon: cl.getIconName(c),
    name: cl.getName(c),
    slug: cl.getSlug(c),
  }));
})();
console.log(JSON.stringify(classes));

const specs = (() => {
  const spec = WH.Wow.PlayerClass.Specialization;
  return spec.getAll().map(s => ({
    id: s,
    icon: spec.getIconName(s),
    name: spec.getName(s),
    slug: spec.getSlug(spec.getClassId(s), s),
    classId: spec.getClassId(s),
  }));
})();
console.log(JSON.stringify(specs));
