const sectionBg = '#0B132B'
const headlineRed = '#FF2020'

export function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-20 py-20 lg:py-28 xl:py-32"
      style={{ backgroundColor: sectionBg }}
    >
      <div className="w-full max-w-none px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
        <div className="mx-auto text-center">
          <p className="text-sm font-bold tracking-wide text-white sm:text-[15px]">About</p>

          <h2
            className="mx-auto mt-8 max-w-[60rem] px-2 leading-[1.15] sm:mt-10 sm:leading-tight lg:mt-12 lg:leading-[1.1] xl:max-w-[64rem] xl:leading-[1.08]"
            style={{
              color: headlineRed,
              fontSize: '3rem',
              fontWeight: 'bold',
            }}
          >
            Raising strong and healthy gamefowl starts with the right supplies.
          </h2>

          <div className="mx-auto mt-10 max-w-xl space-y-6 text-base font-normal leading-relaxed text-white sm:mt-12 sm:max-w-[34rem] sm:text-lg lg:mt-14">
            <p>
              Klasmeyt is a digital marketplace where enthusiasts, breeders, and farmers can find trusted
              products from nearby agrivet and gamefowl supply stores.
            </p>
            <p>
              Instead of searching multiple shops or messaging different sellers, you can browse products, place
              your order, and get the supplies you need—all in one place.
            </p>
            <p>
              At the same time, local stores can reach more customers by bringing their products close to gamefowl
              community.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
